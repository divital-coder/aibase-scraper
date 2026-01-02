use axum::{extract::State, http::StatusCode, Json};
use std::sync::Arc;

use crate::db::{models::{Stats, TagStat}, queries};
use crate::AppState;

pub async fn get_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Stats>, (StatusCode, String)> {
    let stats = queries::get_stats(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(stats))
}

pub async fn get_tag_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<TagStat>>, (StatusCode, String)> {
    let tags = queries::get_tag_stats(&state.pool, 20)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(tags))
}
