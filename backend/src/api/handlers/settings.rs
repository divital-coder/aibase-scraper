use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::db::{models::ScraperSetting, queries};
use crate::AppState;

pub async fn get_settings(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ScraperSetting>>, (StatusCode, String)> {
    let settings = queries::get_all_settings(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(settings))
}

pub async fn update_setting(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
    Json(value): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let updated = queries::update_setting(&state.pool, &key, value.clone())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if updated {
        Ok(Json(serde_json::json!({
            "message": "Setting updated",
            "key": key,
            "value": value
        })))
    } else {
        Err((StatusCode::NOT_FOUND, format!("Setting '{}' not found", key)))
    }
}
