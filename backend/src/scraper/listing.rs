use anyhow::Result;
use scraper::{Html, Selector};

use super::client::ScraperClient;
use super::selectors::{
    LISTING_ARTICLE_CARD, LISTING_ARTICLE_EXCERPT, LISTING_ARTICLE_THUMBNAIL,
    LISTING_ARTICLE_TITLE, NEWS_LISTING_URL,
};

#[derive(Debug, Clone)]
pub struct ArticlePreview {
    pub external_id: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub thumbnail_url: Option<String>,
    pub url: String,
}

pub struct ListingScraper {
    client: ScraperClient,
}

impl ListingScraper {
    pub fn new(client: ScraperClient) -> Self {
        Self { client }
    }

    pub async fn scrape_page(&self, page: u32) -> Result<Vec<ArticlePreview>> {
        let url = if page == 1 {
            NEWS_LISTING_URL.to_string()
        } else {
            format!("{}?page={}", NEWS_LISTING_URL, page)
        };

        tracing::debug!("Fetching listing page: {}", url);
        let html = self.client.fetch(&url).await?;
        self.parse_listing(&html)
    }

    fn parse_listing(&self, html: &str) -> Result<Vec<ArticlePreview>> {
        let document = Html::parse_document(html);
        let mut articles = Vec::new();

        // Try to find article links
        let card_selector = Selector::parse(LISTING_ARTICLE_CARD).unwrap();
        let title_selector = Selector::parse(LISTING_ARTICLE_TITLE).ok();
        let excerpt_selector = Selector::parse(LISTING_ARTICLE_EXCERPT).ok();
        let img_selector = Selector::parse(LISTING_ARTICLE_THUMBNAIL).ok();

        for element in document.select(&card_selector) {
            // Extract article ID from href
            let href = match element.value().attr("href") {
                Some(h) => h,
                None => continue,
            };

            // Parse /news/{id} pattern
            let external_id = match href.strip_prefix("/news/") {
                Some(id) => id.trim_matches('/').to_string(),
                None => continue,
            };

            // Skip if not a valid article ID (should be numeric)
            if external_id.is_empty() || !external_id.chars().all(|c| c.is_numeric()) {
                continue;
            }

            // Extract title
            let title = if let Some(ref sel) = title_selector {
                element
                    .select(sel)
                    .next()
                    .map(|e| e.text().collect::<String>().trim().to_string())
            } else {
                None
            }
            .or_else(|| {
                // Fallback: use link text
                let text: String = element.text().collect();
                let text = text.trim();
                if !text.is_empty() {
                    Some(text.lines().next().unwrap_or(text).trim().to_string())
                } else {
                    None
                }
            })
            .unwrap_or_else(|| format!("Article {}", external_id));

            // Extract excerpt
            let excerpt = if let Some(ref sel) = excerpt_selector {
                element
                    .select(sel)
                    .next()
                    .map(|e| e.text().collect::<String>().trim().to_string())
                    .filter(|s| !s.is_empty())
            } else {
                None
            };

            // Extract thumbnail
            let thumbnail_url = if let Some(ref sel) = img_selector {
                element
                    .select(sel)
                    .next()
                    .and_then(|e| e.value().attr("src").or_else(|| e.value().attr("data-src")))
                    .map(|s| s.to_string())
            } else {
                None
            };

            let url = format!("https://news.aibase.com{}", href);

            articles.push(ArticlePreview {
                external_id,
                title,
                excerpt,
                thumbnail_url,
                url,
            });
        }

        // Deduplicate by external_id
        let mut seen = std::collections::HashSet::new();
        articles.retain(|a| seen.insert(a.external_id.clone()));

        tracing::debug!("Found {} articles on page", articles.len());
        Ok(articles)
    }

    pub async fn discover_all_article_ids(&self, max_pages: u32) -> Result<Vec<String>> {
        let mut all_ids = Vec::new();
        let mut page = 1;

        loop {
            let articles = self.scrape_page(page).await?;

            if articles.is_empty() {
                tracing::info!("No more articles found at page {}", page);
                break;
            }

            for article in articles {
                all_ids.push(article.external_id);
            }

            page += 1;
            if page > max_pages {
                tracing::info!("Reached max pages limit: {}", max_pages);
                break;
            }
        }

        Ok(all_ids)
    }
}
