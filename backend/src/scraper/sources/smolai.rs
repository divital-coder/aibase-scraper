use anyhow::Result;
use chrono::{DateTime, NaiveDate, Utc};
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

use crate::db::models::NewArticle;
use crate::scraper::client::ScraperClient;
use super::Source;

// CSS selectors for smol.ai website
pub mod selectors {
    pub const BASE_URL: &str = "https://news.smol.ai";
    pub const ARCHIVE_URL: &str = "https://news.smol.ai/issues";

    // Archive page selectors
    pub const ISSUE_LINK: &str = "a[href^='/issues/']";

    // Article page selectors
    pub const ARTICLE_TITLE: &str = "h1";
    pub const ARTICLE_CONTENT: &str = "article.content-area";
    pub const ARTICLE_DATE: &str = "time, .date";
    pub const ARTICLE_TAGS: &str = "[data-pagefind-filter='company'], [data-pagefind-filter='topic']";
}

pub struct SmolAIScraper {
    client: ScraperClient,
}

impl SmolAIScraper {
    pub fn new(rate_limit: u32, max_retries: u32) -> Result<Self> {
        let client = ScraperClient::new(rate_limit, max_retries)?;
        Ok(Self { client })
    }

    pub fn source(&self) -> Source {
        Source::SmolAI
    }

    /// Discover all articles from the archive page
    pub async fn discover_articles(&self, max_count: Option<u32>) -> Result<Vec<String>> {
        tracing::info!("smol.ai: Fetching archive page: {}", selectors::ARCHIVE_URL);
        let html = self.client.fetch(selectors::ARCHIVE_URL).await?;

        let document = Html::parse_document(&html);
        let link_selector = Selector::parse(selectors::ISSUE_LINK).unwrap();

        let mut seen = std::collections::HashSet::new();
        let mut article_ids = Vec::new();

        for element in document.select(&link_selector) {
            if let Some(href) = element.value().attr("href") {
                // Extract the slug from /issues/YY-MM-DD-slug
                if let Some(slug) = href.strip_prefix("/issues/") {
                    let slug = slug.trim_matches('/');

                    // Skip empty or non-article slugs
                    if slug.is_empty() || slug == "issues" {
                        continue;
                    }

                    // Skip if already seen
                    if !seen.insert(slug.to_string()) {
                        continue;
                    }

                    article_ids.push(slug.to_string());

                    // Check max count
                    if let Some(max) = max_count {
                        if article_ids.len() >= max as usize {
                            break;
                        }
                    }
                }
            }
        }

        tracing::info!("smol.ai: Discovered {} articles from archive", article_ids.len());
        Ok(article_ids)
    }

    /// Scrape a single article by its slug (external_id)
    pub async fn scrape_article(&self, external_id: &str) -> Result<NewArticle> {
        let url = format!("{}/issues/{}", selectors::BASE_URL, external_id);
        tracing::debug!("smol.ai: Fetching article: {}", url);

        let html = self.client.fetch(&url).await?;
        self.parse_article(external_id, &url, &html)
    }

    fn parse_article(&self, external_id: &str, url: &str, html: &str) -> Result<NewArticle> {
        let document = Html::parse_document(html);

        // Extract title from h1 or page title
        let title = self.extract_title(&document, external_id);

        // Extract content
        let content = self.extract_content(&document);

        // Excerpt - first 200 chars of content
        let excerpt = if content.len() > 200 {
            Some(format!("{}...", &content[..200].trim()))
        } else {
            Some(content.clone())
        };

        // Extract date from slug (YY-MM-DD format)
        let published_at = self.parse_date_from_slug(external_id);

        // Extract tags
        let tags = self.extract_tags(&document);

        // Compute content hash
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
            author: Some("smol.ai".to_string()), // smol.ai is curated content
            source: Some(Source::SmolAI.display_name().to_string()),
            published_at,
            view_count: None,
            read_time_minutes,
            thumbnail_url: None, // smol.ai doesn't have thumbnails
            content_hash,
            tags,
        })
    }

    fn extract_title(&self, document: &Html, external_id: &str) -> String {
        // Try h1 first
        let h1_selector = Selector::parse(selectors::ARTICLE_TITLE).unwrap();
        if let Some(el) = document.select(&h1_selector).next() {
            let title = el.text().collect::<String>().trim().to_string();
            if !title.is_empty() {
                return title;
            }
        }

        // Try title tag
        let title_selector = Selector::parse("title").unwrap();
        if let Some(el) = document.select(&title_selector).next() {
            let title = el.text().collect::<String>().trim().to_string();
            // Remove " - AINews" suffix if present
            let title = title.split(" - ").next().unwrap_or(&title).trim();
            if !title.is_empty() {
                return title.to_string();
            }
        }

        // Fallback: generate from slug
        let title_part = external_id
            .split('-')
            .skip(3) // Skip YY-MM-DD
            .collect::<Vec<_>>()
            .join(" ");

        if title_part.is_empty() {
            format!("Issue {}", external_id)
        } else {
            title_part
        }
    }

    fn extract_content(&self, document: &Html) -> String {
        let content_selector = Selector::parse(selectors::ARTICLE_CONTENT).unwrap();

        // Get the full inner HTML of the content area
        for content_el in document.select(&content_selector) {
            let inner_html = content_el.inner_html();
            if !inner_html.trim().is_empty() {
                // Clean up the HTML a bit - remove excessive whitespace between tags
                let cleaned = inner_html
                    .lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .collect::<Vec<_>>()
                    .join("\n");
                return cleaned;
            }
        }

        // Fallback: extract text content if HTML extraction fails
        let p_selector = Selector::parse("p").unwrap();
        let paragraphs: Vec<String> = document
            .select(&p_selector)
            .map(|p| p.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty() && s.len() > 20)
            .collect();

        if !paragraphs.is_empty() {
            return paragraphs.join("\n\n");
        }

        "Content not available".to_string()
    }

    fn parse_date_from_slug(&self, slug: &str) -> Option<DateTime<Utc>> {
        // Slug format: YY-MM-DD-title-slug
        let parts: Vec<&str> = slug.split('-').collect();

        if parts.len() >= 3 {
            let year = parts[0].parse::<i32>().ok()?;
            let month = parts[1].parse::<u32>().ok()?;
            let day = parts[2].parse::<u32>().ok()?;

            // Convert YY to YYYY (assuming 20XX for now)
            let full_year = if year < 100 { 2000 + year } else { year };

            let date = NaiveDate::from_ymd_opt(full_year, month, day)?;
            Some(date.and_hms_opt(0, 0, 0)?.and_utc())
        } else {
            None
        }
    }

    fn extract_tags(&self, document: &Html) -> Vec<String> {
        let selector = match Selector::parse(selectors::ARTICLE_TAGS) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        document
            .select(&selector)
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty() && s.len() < 50)
            .take(20) // smol.ai has more tags
            .collect()
    }

    fn compute_hash(&self, content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize())
    }
}
