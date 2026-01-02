pub mod article;
pub mod client;
pub mod listing;
pub mod selectors;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapeProgress {
    pub run_id: Uuid,
    pub progress_type: ProgressType,
    pub pages_scraped: i32,
    pub total_pages: Option<i32>,
    pub articles_found: i32,
    pub articles_new: i32,
    pub articles_failed: i32,
    pub current_article: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProgressType {
    Started,
    Progress,
    Completed,
    Failed,
    Cancelled,
}
