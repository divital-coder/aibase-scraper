use anyhow::Result;
use chrono::{DateTime, NaiveDateTime, Utc};
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

use crate::db::models::NewArticle;
use crate::scraper::client::ScraperClient;
use super::Source;

// CSS selectors for AIBase website
pub mod selectors {
    pub const LISTING_ARTICLE_CARD: &str = "a[href^='/news/']";
    pub const LISTING_ARTICLE_TITLE: &str = "h2, h3, .title";
    pub const LISTING_ARTICLE_EXCERPT: &str = "p, .excerpt, .description";
    pub const LISTING_ARTICLE_THUMBNAIL: &str = "img";

    pub const ARTICLE_TITLE: &str = "h1";
    pub const ARTICLE_CONTENT: &str = "article, .article-content, .content, .post-content, main";
    pub const ARTICLE_PARAGRAPHS: &str = "p";
    pub const ARTICLE_DATE: &str = "time, [datetime], .date, .published";
    pub const ARTICLE_AUTHOR: &str = ".author, .byline, [rel='author']";
    pub const ARTICLE_TAGS: &str = ".tag, .tags a, [rel='tag']";
    pub const ARTICLE_VIEW_COUNT: &str = ".views, .view-count, .read-count";
    pub const ARTICLE_THUMBNAIL: &str = "meta[property='og:image'], .featured-image img, article img";

    pub const BASE_URL: &str = "https://news.aibase.com";
    pub const NEWS_LISTING_URL: &str = "https://news.aibase.com/news";
}

pub struct AIBaseScraper {
    client: ScraperClient,
}

impl AIBaseScraper {
    pub fn new(rate_limit: u32, max_retries: u32) -> Result<Self> {
        let client = ScraperClient::new(rate_limit, max_retries)?;
        Ok(Self { client })
    }

    pub fn source(&self) -> Source {
        Source::AIBase
    }

    /// Discover articles from listing pages (pagination-based)
    pub async fn discover_articles(&self, max_pages: u32) -> Result<Vec<String>> {
        let mut all_ids = Vec::new();
        let mut page = 1;

        loop {
            let articles = self.scrape_listing_page(page).await?;

            if articles.is_empty() {
                tracing::info!("AIBase: No more articles found at page {}", page);
                break;
            }

            for (external_id, _) in articles {
                all_ids.push(external_id);
            }

            page += 1;
            if page > max_pages {
                tracing::info!("AIBase: Reached max pages limit: {}", max_pages);
                break;
            }
        }

        Ok(all_ids)
    }

    /// Scrape a listing page and return article IDs with titles
    pub async fn scrape_listing_page(&self, page: u32) -> Result<Vec<(String, String)>> {
        let url = if page == 1 {
            selectors::NEWS_LISTING_URL.to_string()
        } else {
            format!("{}?page={}", selectors::NEWS_LISTING_URL, page)
        };

        tracing::debug!("AIBase: Fetching listing page: {}", url);
        let html = self.client.fetch(&url).await?;
        self.parse_listing(&html)
    }

    fn parse_listing(&self, html: &str) -> Result<Vec<(String, String)>> {
        let document = Html::parse_document(html);
        let mut articles = Vec::new();

        let card_selector = Selector::parse(selectors::LISTING_ARTICLE_CARD).unwrap();
        let title_selector = Selector::parse(selectors::LISTING_ARTICLE_TITLE).ok();

        for element in document.select(&card_selector) {
            let href = match element.value().attr("href") {
                Some(h) => h,
                None => continue,
            };

            let external_id = match href.strip_prefix("/news/") {
                Some(id) => id.trim_matches('/').to_string(),
                None => continue,
            };

            if external_id.is_empty() || !external_id.chars().all(|c| c.is_numeric()) {
                continue;
            }

            let title = if let Some(ref sel) = title_selector {
                element
                    .select(sel)
                    .next()
                    .map(|e| e.text().collect::<String>().trim().to_string())
            } else {
                None
            }
            .unwrap_or_else(|| format!("Article {}", external_id));

            articles.push((external_id, title));
        }

        // Deduplicate
        let mut seen = std::collections::HashSet::new();
        articles.retain(|(id, _)| seen.insert(id.clone()));

        tracing::debug!("AIBase: Found {} articles on page", articles.len());
        Ok(articles)
    }

    /// Scrape a single article by external ID
    pub async fn scrape_article(&self, external_id: &str) -> Result<NewArticle> {
        let url = format!("{}/news/{}", selectors::BASE_URL, external_id);
        tracing::debug!("AIBase: Fetching article: {}", url);

        let html = self.client.fetch(&url).await?;
        self.parse_article(external_id, &url, &html)
    }

    fn parse_article(&self, external_id: &str, url: &str, html: &str) -> Result<NewArticle> {
        let document = Html::parse_document(html);

        let title_selector = Selector::parse(selectors::ARTICLE_TITLE).unwrap();
        let title = document
            .select(&title_selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_else(|| format!("Article {}", external_id));

        let content = self.extract_content(&document);

        let excerpt = if content.len() > 200 {
            Some(format!("{}...", &content[..200].trim()))
        } else {
            Some(content.clone())
        };

        let author = self.extract_text(&document, selectors::ARTICLE_AUTHOR);
        let published_at = self.extract_date(&document);
        let tags = self.extract_tags(&document);
        let view_count = self.extract_view_count(&document);
        let thumbnail_url = self.extract_thumbnail(&document);
        let content_hash = self.compute_hash(&content);

        let word_count = content.split_whitespace().count();
        let read_time_minutes = Some((word_count / 200).max(1) as i32);

        Ok(NewArticle {
            external_id: external_id.to_string(),
            url: url.to_string(),
            title,
            content,
            excerpt,
            author,
            source: Some(Source::AIBase.display_name().to_string()),
            published_at,
            view_count,
            read_time_minutes,
            thumbnail_url,
            content_hash,
            tags,
        })
    }

    fn extract_content(&self, document: &Html) -> String {
        let content_selector = Selector::parse(selectors::ARTICLE_CONTENT).unwrap();
        let p_selector = Selector::parse(selectors::ARTICLE_PARAGRAPHS).unwrap();

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

    fn extract_text(&self, document: &Html, selector_str: &str) -> Option<String> {
        let selector = Selector::parse(selector_str).ok()?;
        document
            .select(&selector)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
    }

    fn extract_date(&self, document: &Html) -> Option<DateTime<Utc>> {
        let selector = Selector::parse(selectors::ARTICLE_DATE).ok()?;

        for element in document.select(&selector) {
            if let Some(datetime) = element.value().attr("datetime") {
                if let Ok(dt) = DateTime::parse_from_rfc3339(datetime) {
                    return Some(dt.with_timezone(&Utc));
                }
            }

            if let Some(ts) = element.value().attr("data-timestamp") {
                if let Ok(ms) = ts.parse::<i64>() {
                    if let Some(dt) = DateTime::from_timestamp_millis(ms) {
                        return Some(dt);
                    }
                }
            }

            let text = element.text().collect::<String>();
            let text = text.trim();

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
        let selector = match Selector::parse(selectors::ARTICLE_TAGS) {
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
        let selector = Selector::parse(selectors::ARTICLE_VIEW_COUNT).ok()?;

        for element in document.select(&selector) {
            let text: String = element.text().collect();
            let num_str: String = text.chars().filter(|c| c.is_numeric()).collect();
            if let Ok(count) = num_str.parse::<i64>() {
                return Some(count);
            }
        }

        None
    }

    fn extract_thumbnail(&self, document: &Html) -> Option<String> {
        let selector = Selector::parse(selectors::ARTICLE_THUMBNAIL).ok()?;

        for element in document.select(&selector) {
            if element.value().name() == "meta" {
                if let Some(content) = element.value().attr("content") {
                    if content.starts_with("http") {
                        return Some(content.to_string());
                    }
                }
            }

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
