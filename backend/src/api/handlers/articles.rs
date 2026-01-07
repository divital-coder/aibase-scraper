use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::db::{models::ArticlePreview, queries};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListArticlesQuery {
    #[serde(default = "default_page")]
    pub page: i64,
    #[serde(default = "default_per_page")]
    pub per_page: i64,
    pub search: Option<String>,
    pub tag: Option<String>,
    pub source: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_per_page() -> i64 {
    20
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub pagination: Pagination,
}

#[derive(Debug, Serialize)]
pub struct Pagination {
    pub page: i64,
    pub per_page: i64,
    pub total: i64,
    pub total_pages: i64,
}

pub async fn list_articles(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListArticlesQuery>,
) -> Result<Json<PaginatedResponse<ArticlePreview>>, (StatusCode, String)> {
    let per_page = query.per_page.min(100).max(1);
    let page = query.page.max(1);

    let (articles, total) = queries::get_articles(
        &state.pool,
        page,
        per_page,
        query.search.as_deref(),
        query.tag.as_deref(),
        query.source.as_deref(),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_pages = (total + per_page - 1) / per_page;

    Ok(Json(PaginatedResponse {
        data: articles,
        pagination: Pagination {
            page,
            per_page,
            total,
            total_pages,
        },
    }))
}

pub async fn get_article(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<crate::db::models::Article>, (StatusCode, String)> {
    // Try parsing as UUID first, then as external_id
    let article = if let Ok(uuid) = Uuid::parse_str(&id) {
        queries::get_article_by_id(&state.pool, uuid).await
    } else {
        queries::get_article_by_external_id(&state.pool, &id).await
    };

    match article {
        Ok(Some(article)) => Ok(Json(article)),
        Ok(None) => Err((StatusCode::NOT_FOUND, "Article not found".to_string())),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn delete_article(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let deleted = queries::delete_article(&state.pool, id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err((StatusCode::NOT_FOUND, "Article not found".to_string()))
    }
}
