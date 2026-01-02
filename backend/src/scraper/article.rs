use anyhow::Result;
use chrono::{DateTime, NaiveDateTime, Utc};
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

use super::client::ScraperClient;
use super::selectors::{
    ARTICLE_AUTHOR, ARTICLE_CONTENT, ARTICLE_DATE, ARTICLE_PARAGRAPHS, ARTICLE_TAGS,
    ARTICLE_THUMBNAIL, ARTICLE_TITLE, ARTICLE_VIEW_COUNT, BASE_URL,
};
use crate::db::models::NewArticle;

pub struct ArticleScraper {
    client: ScraperClient,
}

impl ArticleScraper {
    pub fn new(client: ScraperClient) -> Self {
        Self { client }
    }

    pub async fn scrape_article(&self, external_id: &str) -> Result<NewArticle> {
        let url = format!("{}/news/{}", BASE_URL, external_id);
        tracing::debug!("Fetching article: {}", url);

        let html = self.client.fetch(&url).await?;
        self.parse_article(external_id, &url, &html)
    }

    fn parse_article(&self, external_id: &str, url: &str, html: &str) -> Result<NewArticle> {
        let document = Html::parse_document(html);

        // Title
        let title_selector = Selector::parse(ARTICLE_TITLE).unwrap();
        let title = document
            .select(&title_selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_else(|| format!("Article {}", external_id));

        // Content - try multiple selectors
        let content = self.extract_content(&document);

        // Excerpt - first 200 chars of content
        let excerpt = if content.len() > 200 {
            Some(format!("{}...", &content[..200].trim()))
        } else {
            Some(content.clone())
        };

        // Author
        let author = self.extract_text(&document, ARTICLE_AUTHOR);

        // Published date
        let published_at = self.extract_date(&document);

        // Tags
        let tags = self.extract_tags(&document);

        // View count
        let view_count = self.extract_view_count(&document);

        // Thumbnail
        let thumbnail_url = self.extract_thumbnail(&document);

        // Content hash for change detection
        let content_hash = self.compute_hash(&content);

        // Estimate read time (average 200 words per minute)
        let word_count = content.split_whitespace().count();
        let read_time_minutes = Some((word_count / 200).max(1) as i32);

        Ok(NewArticle {
            external_id: external_id.to_string(),
            url: url.to_string(),
            title,
            content,
            excerpt,
            author,
            source: Some("AIBase".to_string()),
            published_at,
            view_count,
            read_time_minutes,
            thumbnail_url,
            content_hash,
            tags,
        })
    }

    fn extract_content(&self, document: &Html) -> String {
        // Try content container first
        let content_selector = Selector::parse(ARTICLE_CONTENT).unwrap();
        let p_selector = Selector::parse(ARTICLE_PARAGRAPHS).unwrap();

        for content_el in document.select(&content_selector) {
            let paragraphs: Vec<String> = content_el
                .select(&p_selector)
                .map(|p| p.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();

            if !paragraphs.is_empty() {
                return paragraphs.join("\n\n");
            }
        }

        // Fallback: collect all paragraphs in body
        let paragraphs: Vec<String> = document
            .select(&p_selector)
            .map(|p| p.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty() && s.len() > 20) // Filter out short nav items
            .collect();

        if !paragraphs.is_empty() {
            return paragraphs.join("\n\n");
        }

        "Content not available".to_string()
    }

    fn extract_text(&self, document: &Html, selector_str: &str) -> Option<String> {
        let selector = Selector::parse(selector_str).ok()?;
        document
            .select(&selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
    }

    fn extract_date(&self, document: &Html) -> Option<DateTime<Utc>> {
        let selector = Selector::parse(ARTICLE_DATE).ok()?;

        for element in document.select(&selector) {
            // Try datetime attribute first
            if let Some(datetime) = element.value().attr("datetime") {
                if let Ok(dt) = DateTime::parse_from_rfc3339(datetime) {
                    return Some(dt.with_timezone(&Utc));
                }
            }

            // Try data-timestamp (milliseconds)
            if let Some(ts) = element.value().attr("data-timestamp") {
                if let Ok(ms) = ts.parse::<i64>() {
                    if let Some(dt) = DateTime::from_timestamp_millis(ms) {
                        return Some(dt);
                    }
                }
            }

            // Try parsing text content
            let text = element.text().collect::<String>();
            let text = text.trim();

            // Common date formats
            let formats = [
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%B %d, %Y",
                "%b %d, %Y",
                "%d %B %Y",
                "%Y/%m/%d",
            ];

            for format in formats {
                if let Ok(dt) = NaiveDateTime::parse_from_str(text, format) {
                    return Some(dt.and_utc());
                }
                if let Ok(date) = chrono::NaiveDate::parse_from_str(text, format) {
                    return Some(date.and_hms_opt(0, 0, 0)?.and_utc());
                }
            }
        }

        None
    }

    fn extract_tags(&self, document: &Html) -> Vec<String> {
        let selector = match Selector::parse(ARTICLE_TAGS) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        document
            .select(&selector)
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty() && s.len() < 50)
            .take(10)
            .collect()
    }

    fn extract_view_count(&self, document: &Html) -> Option<i64> {
        let selector = Selector::parse(ARTICLE_VIEW_COUNT).ok()?;

        for element in document.select(&selector) {
            let text: String = element.text().collect();
            // Extract numbers from text like "1,234 views"
            let num_str: String = text.chars().filter(|c| c.is_numeric()).collect();
            if let Ok(count) = num_str.parse::<i64>() {
                return Some(count);
            }
        }

        None
    }

    fn extract_thumbnail(&self, document: &Html) -> Option<String> {
        let selector = Selector::parse(ARTICLE_THUMBNAIL).ok()?;

        for element in document.select(&selector) {
            // Check og:image meta tag
            if element.value().name() == "meta" {
                if let Some(content) = element.value().attr("content") {
                    if content.starts_with("http") {
                        return Some(content.to_string());
                    }
                }
            }

            // Check img src
            if let Some(src) = element.value().attr("src") {
                if src.starts_with("http") {
                    return Some(src.to_string());
                }
            }
        }

        None
    }

    fn compute_hash(&self, content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize())
    }
}
