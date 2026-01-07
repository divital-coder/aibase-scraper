use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Article {
    pub id: Uuid,
    pub external_id: String,
    pub url: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author: Option<String>,
    pub source: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub view_count: Option<i64>,
    pub read_time_minutes: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub scraped_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub content_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticlePreview {
    pub id: Uuid,
    pub external_id: String,
    pub title: String,
    pub excerpt: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub thumbnail_url: Option<String>,
    pub view_count: Option<i64>,
    pub tags: Vec<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewArticle {
    pub external_id: String,
    pub url: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author: Option<String>,
    pub source: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub view_count: Option<i64>,
    pub read_time_minutes: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub content_hash: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Tag {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "scrape_status", rename_all = "lowercase")]
pub enum ScrapeStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "scrape_type", rename_all = "lowercase")]
pub enum ScrapeType {
    Full,
    Incremental,
    Single,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ScrapeRun {
    pub id: Uuid,
    pub scrape_type: ScrapeType,
    pub status: ScrapeStatus,
    pub total_pages: Option<i32>,
    pub pages_scraped: Option<i32>,
    pub articles_found: Option<i32>,
    pub articles_new: Option<i32>,
    pub articles_updated: Option<i32>,
    pub articles_failed: Option<i32>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub error_count: Option<i32>,
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ScraperSetting {
    pub key: String,
    pub value: serde_json::Value,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub total_articles: i64,
    pub articles_today: i64,
    pub articles_this_week: i64,
    pub last_scrape: Option<DateTime<Utc>>,
    pub total_scrape_runs: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagStat {
    pub name: String,
    pub count: i64,
}
