use axum::Json;

use crate::db::queries;
use crate::scraper::SourceInfo;

pub async fn list_sources() -> Json<Vec<SourceInfo>> {
    Json(queries::get_sources())
}
