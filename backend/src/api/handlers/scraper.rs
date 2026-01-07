use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::db::{
    models::{ScrapeRun, ScrapeStatus, ScrapeType},
    queries,
};
use crate::scraper::{
    sources::{aibase::AIBaseScraper, smolai::SmolAIScraper},
    Source, ProgressType, ScrapeProgress,
};
use crate::AppState;

// Global flag for cancellation
static CANCEL_FLAG: Mutex<Option<Uuid>> = Mutex::const_new(None);

#[derive(Debug, Deserialize)]
pub struct StartScrapeRequest {
    #[serde(default)]
    pub scrape_type: ScrapeTypeInput,
    pub max_pages: Option<u32>,
    #[serde(default)]
    pub force_rescrape: bool,
    #[serde(default = "default_source")]
    pub source: String,
}

fn default_source() -> String {
    "aibase".to_string()
}

#[derive(Debug, Deserialize)]
pub struct StartRangeScrapeRequest {
    pub start_id: u32,
    pub end_id: u32,
    #[serde(default)]
    pub force_rescrape: bool,
    #[serde(default = "default_source")]
    pub source: String,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ScrapeTypeInput {
    Full,
    #[default]
    Incremental,
}

#[derive(Debug, Serialize)]
pub struct ScrapeStartResponse {
    pub run_id: Uuid,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ScrapeStatusResponse {
    pub running: bool,
    pub current_run: Option<ScrapeRun>,
}

pub async fn start_scrape(
    State(state): State<Arc<AppState>>,
    Json(request): Json<StartScrapeRequest>,
) -> Result<Json<ScrapeStartResponse>, (StatusCode, String)> {
    // Validate source
    let source = Source::from_str(&request.source).ok_or((
        StatusCode::BAD_REQUEST,
        format!("Unknown source: {}", request.source),
    ))?;

    // Check if already running
    if let Some(run) = queries::get_running_scrape(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return Err((
            StatusCode::CONFLICT,
            format!("Scrape already running: {}", run.id),
        ));
    }

    let scrape_type = match request.scrape_type {
        ScrapeTypeInput::Full => ScrapeType::Full,
        ScrapeTypeInput::Incremental => ScrapeType::Incremental,
    };

    let max_pages = request.max_pages.unwrap_or(100);
    let stop_on_existing = matches!(scrape_type, ScrapeType::Incremental);

    // Create scrape run record
    let run_id = queries::create_scrape_run(
        &state.pool,
        scrape_type,
        Some(serde_json::json!({
            "source": source.id(),
            "max_pages": max_pages,
            "force_rescrape": request.force_rescrape,
            "stop_on_existing": stop_on_existing,
        })),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Clear cancel flag
    *CANCEL_FLAG.lock().await = None;

    // Spawn scraping task
    let pool = state.pool.clone();
    let config = state.config.clone();
    let progress_tx = state.progress_tx.clone();

    tokio::spawn(async move {
        let result = run_source_scrape(
            pool.clone(),
            config.scraper_rate_limit,
            config.scraper_max_retries,
            run_id,
            source,
            max_pages,
            stop_on_existing,
            request.force_rescrape,
            progress_tx.clone(),
        )
        .await;

        let status = match result {
            Ok(_) => ScrapeStatus::Completed,
            Err(e) => {
                tracing::error!("Scrape failed: {}", e);
                ScrapeStatus::Failed
            }
        };

        let _ = queries::complete_scrape_run(&pool, run_id, status).await;

        let _ = progress_tx.send(ScrapeProgress {
            run_id,
            progress_type: if matches!(status, ScrapeStatus::Completed) {
                ProgressType::Completed
            } else {
                ProgressType::Failed
            },
            pages_scraped: 0,
            total_pages: None,
            articles_found: 0,
            articles_new: 0,
            articles_failed: 0,
            current_article: None,
            message: Some(format!("{} scrape {:?}", source.display_name(), status)),
        });
    });

    Ok(Json(ScrapeStartResponse {
        run_id,
        message: format!("{} scrape started", source.display_name()),
    }))
}

// ID range scrape: only for AIBase
pub async fn start_range_scrape(
    State(state): State<Arc<AppState>>,
    Json(request): Json<StartRangeScrapeRequest>,
) -> Result<Json<ScrapeStartResponse>, (StatusCode, String)> {
    // Validate source - only AIBase supports range scraping
    let source = Source::from_str(&request.source).ok_or((
        StatusCode::BAD_REQUEST,
        format!("Unknown source: {}", request.source),
    ))?;

    if !matches!(source, Source::AIBase) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Range scraping is only supported for AIBase".to_string(),
        ));
    }

    // Validate range
    if request.start_id >= request.end_id {
        return Err((
            StatusCode::BAD_REQUEST,
            "start_id must be less than end_id".to_string(),
        ));
    }

    let total_articles = request.end_id - request.start_id + 1;
    if total_articles > 50000 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Range too large. Maximum 50,000 articles per run.".to_string(),
        ));
    }

    // Check if already running
    if let Some(run) = queries::get_running_scrape(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return Err((
            StatusCode::CONFLICT,
            format!("Scrape already running: {}", run.id),
        ));
    }

    // Create scrape run record
    let run_id = queries::create_scrape_run(
        &state.pool,
        ScrapeType::Full,
        Some(serde_json::json!({
            "source": source.id(),
            "mode": "range",
            "start_id": request.start_id,
            "end_id": request.end_id,
            "force_rescrape": request.force_rescrape,
        })),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Clear cancel flag
    *CANCEL_FLAG.lock().await = None;

    // Spawn scraping task
    let pool = state.pool.clone();
    let config = state.config.clone();
    let progress_tx = state.progress_tx.clone();

    tokio::spawn(async move {
        let result = run_range_scrape(
            pool.clone(),
            config.scraper_rate_limit,
            config.scraper_max_retries,
            run_id,
            request.start_id,
            request.end_id,
            request.force_rescrape,
            progress_tx.clone(),
        )
        .await;

        let status = match result {
            Ok(_) => ScrapeStatus::Completed,
            Err(e) => {
                tracing::error!("Range scrape failed: {}", e);
                ScrapeStatus::Failed
            }
        };

        let _ = queries::complete_scrape_run(&pool, run_id, status).await;

        let _ = progress_tx.send(ScrapeProgress {
            run_id,
            progress_type: if matches!(status, ScrapeStatus::Completed) {
                ProgressType::Completed
            } else {
                ProgressType::Failed
            },
            pages_scraped: 0,
            total_pages: None,
            articles_found: 0,
            articles_new: 0,
            articles_failed: 0,
            current_article: None,
            message: Some(format!("Range scrape {:?}", status)),
        });
    });

    Ok(Json(ScrapeStartResponse {
        run_id,
        message: format!(
            "AIBase range scrape started: {} to {} ({} articles)",
            request.start_id, request.end_id, total_articles
        ),
    }))
}

async fn run_range_scrape(
    pool: sqlx::PgPool,
    rate_limit: u32,
    max_retries: u32,
    run_id: Uuid,
    start_id: u32,
    end_id: u32,
    force_rescrape: bool,
    progress_tx: tokio::sync::broadcast::Sender<ScrapeProgress>,
) -> anyhow::Result<()> {
    let scraper = AIBaseScraper::new(rate_limit, max_retries)?;
    let source_name = Source::AIBase.display_name();

    let total = end_id - start_id + 1;
    let mut processed = 0;
    let mut articles_found = 0;
    let mut articles_new = 0;
    let mut articles_failed = 0;
    let mut articles_skipped = 0;

    // Send start message
    let _ = progress_tx.send(ScrapeProgress {
        run_id,
        progress_type: ProgressType::Started,
        pages_scraped: 0,
        total_pages: Some(total as i32),
        articles_found: 0,
        articles_new: 0,
        articles_failed: 0,
        current_article: None,
        message: Some(format!("Starting AIBase range scrape: {} to {}", start_id, end_id)),
    });

    tracing::info!("Starting AIBase range scrape: {} to {} ({} articles)", start_id, end_id, total);

    for article_id in start_id..=end_id {
        // Check cancellation
        if let Some(cancel_id) = *CANCEL_FLAG.lock().await {
            if cancel_id == run_id {
                tracing::info!("Range scrape cancelled at ID {}", article_id);
                return Ok(());
            }
        }

        let external_id = article_id.to_string();
        processed += 1;

        // Check if article already exists
        let exists = queries::article_exists(&pool, source_name, &external_id).await?;

        if exists && !force_rescrape {
            articles_skipped += 1;
            // Still send progress updates periodically
            if processed % 100 == 0 {
                let _ = progress_tx.send(ScrapeProgress {
                    run_id,
                    progress_type: ProgressType::Progress,
                    pages_scraped: processed as i32,
                    total_pages: Some(total as i32),
                    articles_found,
                    articles_new,
                    articles_failed,
                    current_article: Some(external_id.clone()),
                    message: Some(format!("Skipped {} existing", articles_skipped)),
                });
            }
            continue;
        }

        // Send progress
        let _ = progress_tx.send(ScrapeProgress {
            run_id,
            progress_type: ProgressType::Progress,
            pages_scraped: processed as i32,
            total_pages: Some(total as i32),
            articles_found,
            articles_new,
            articles_failed,
            current_article: Some(external_id.clone()),
            message: None,
        });

        // Scrape article
        match scraper.scrape_article(&external_id).await {
            Ok(article) => {
                articles_found += 1;
                if exists {
                    queries::update_article(&pool, source_name, &external_id, &article).await?;
                } else {
                    queries::insert_article(&pool, &article).await?;
                    articles_new += 1;
                }

                // Log progress every 100 articles
                if articles_new % 100 == 0 {
                    tracing::info!(
                        "Progress: {}/{} processed, {} new, {} failed, {} skipped",
                        processed, total, articles_new, articles_failed, articles_skipped
                    );
                }
            }
            Err(e) => {
                // Check if it's a 404 (article doesn't exist)
                let error_str = e.to_string();
                if error_str.contains("404") || error_str.contains("Not Found") {
                    // Article doesn't exist, just skip
                    articles_skipped += 1;
                } else {
                    tracing::warn!("Failed to scrape article {}: {}", external_id, e);
                    articles_failed += 1;
                }
            }
        }

        // Update database progress every 50 articles
        if processed % 50 == 0 {
            queries::update_scrape_run_progress(
                &pool,
                run_id,
                processed as i32,
                articles_found,
                articles_new,
                articles_failed,
            )
            .await?;
        }
    }

    // Final update
    queries::update_scrape_run_progress(
        &pool,
        run_id,
        processed as i32,
        articles_found,
        articles_new,
        articles_failed,
    )
    .await?;

    tracing::info!(
        "Range scrape complete: {}/{} processed, {} found, {} new, {} failed, {} skipped",
        processed, total, articles_found, articles_new, articles_failed, articles_skipped
    );

    Ok(())
}

async fn run_source_scrape(
    pool: sqlx::PgPool,
    rate_limit: u32,
    max_retries: u32,
    run_id: Uuid,
    source: Source,
    max_pages: u32,
    stop_on_existing: bool,
    force_rescrape: bool,
    progress_tx: tokio::sync::broadcast::Sender<ScrapeProgress>,
) -> anyhow::Result<()> {
    let source_name = source.display_name();

    // Send start message
    let _ = progress_tx.send(ScrapeProgress {
        run_id,
        progress_type: ProgressType::Started,
        pages_scraped: 0,
        total_pages: None,
        articles_found: 0,
        articles_new: 0,
        articles_failed: 0,
        current_article: None,
        message: Some(format!("Starting {} scrape...", source_name)),
    });

    match source {
        Source::AIBase => {
            run_aibase_scrape(
                pool, rate_limit, max_retries, run_id, max_pages, stop_on_existing,
                force_rescrape, progress_tx,
            ).await
        }
        Source::SmolAI => {
            run_smolai_scrape(
                pool, rate_limit, max_retries, run_id, max_pages, stop_on_existing,
                force_rescrape, progress_tx,
            ).await
        }
    }
}

async fn run_aibase_scrape(
    pool: sqlx::PgPool,
    rate_limit: u32,
    max_retries: u32,
    run_id: Uuid,
    max_pages: u32,
    stop_on_existing: bool,
    force_rescrape: bool,
    progress_tx: tokio::sync::broadcast::Sender<ScrapeProgress>,
) -> anyhow::Result<()> {
    let scraper = AIBaseScraper::new(rate_limit, max_retries)?;
    let source_name = Source::AIBase.display_name();

    let mut pages_scraped = 0;
    let mut articles_found = 0;
    let mut articles_new = 0;
    let mut articles_failed = 0;

    for page in 1..=max_pages {
        // Check cancellation
        if let Some(cancel_id) = *CANCEL_FLAG.lock().await {
            if cancel_id == run_id {
                tracing::info!("AIBase scrape cancelled");
                return Ok(());
            }
        }

        tracing::info!("AIBase: Scraping page {}/{}", page, max_pages);

        let previews = match scraper.scrape_listing_page(page).await {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("AIBase: Failed to scrape page {}: {}", page, e);
                continue;
            }
        };

        if previews.is_empty() {
            tracing::info!("AIBase: No more articles found at page {}", page);
            break;
        }

        let mut all_existing = true;

        for (external_id, _title) in &previews {
            articles_found += 1;

            // Check if article already exists
            let exists = queries::article_exists(&pool, source_name, external_id).await?;

            if exists && !force_rescrape {
                continue;
            }

            all_existing = false;

            // Send progress
            let _ = progress_tx.send(ScrapeProgress {
                run_id,
                progress_type: ProgressType::Progress,
                pages_scraped,
                total_pages: Some(max_pages as i32),
                articles_found,
                articles_new,
                articles_failed,
                current_article: Some(external_id.clone()),
                message: None,
            });

            // Scrape article
            match scraper.scrape_article(external_id).await {
                Ok(article) => {
                    if exists {
                        queries::update_article(&pool, source_name, external_id, &article).await?;
                    } else {
                        queries::insert_article(&pool, &article).await?;
                        articles_new += 1;
                    }
                }
                Err(e) => {
                    tracing::error!("AIBase: Failed to scrape article {}: {}", external_id, e);
                    articles_failed += 1;
                }
            }
        }

        pages_scraped += 1;

        // Update run progress
        queries::update_scrape_run_progress(
            &pool,
            run_id,
            pages_scraped,
            articles_found,
            articles_new,
            articles_failed,
        )
        .await?;

        // Stop if all articles on page exist (incremental mode)
        if all_existing && stop_on_existing {
            tracing::info!("AIBase: All articles on page {} already exist, stopping", page);
            break;
        }
    }

    tracing::info!(
        "AIBase scrape complete: {} pages, {} articles found, {} new, {} failed",
        pages_scraped, articles_found, articles_new, articles_failed
    );

    Ok(())
}

async fn run_smolai_scrape(
    pool: sqlx::PgPool,
    rate_limit: u32,
    max_retries: u32,
    run_id: Uuid,
    max_count: u32,
    stop_on_existing: bool,
    force_rescrape: bool,
    progress_tx: tokio::sync::broadcast::Sender<ScrapeProgress>,
) -> anyhow::Result<()> {
    let scraper = SmolAIScraper::new(rate_limit, max_retries)?;
    let source_name = Source::SmolAI.display_name();

    // Discover all articles from archive
    tracing::info!("smol.ai: Discovering articles from archive...");
    let article_ids = scraper.discover_articles(Some(max_count)).await?;
    let total = article_ids.len() as i32;

    tracing::info!("smol.ai: Found {} articles to process", total);

    let _ = progress_tx.send(ScrapeProgress {
        run_id,
        progress_type: ProgressType::Progress,
        pages_scraped: 0,
        total_pages: Some(total),
        articles_found: total,
        articles_new: 0,
        articles_failed: 0,
        current_article: None,
        message: Some(format!("Discovered {} articles", total)),
    });

    let mut processed = 0;
    let mut articles_new = 0;
    let mut articles_failed = 0;

    for external_id in &article_ids {
        // Check cancellation
        if let Some(cancel_id) = *CANCEL_FLAG.lock().await {
            if cancel_id == run_id {
                tracing::info!("smol.ai: Scrape cancelled");
                return Ok(());
            }
        }

        processed += 1;

        // Check if article already exists
        let exists = queries::article_exists(&pool, source_name, external_id).await?;

        if exists && !force_rescrape {
            // In incremental mode, stop if we hit existing articles
            if stop_on_existing {
                tracing::info!("smol.ai: Found existing article {}, stopping", external_id);
                break;
            }
            continue;
        }

        // Send progress
        let _ = progress_tx.send(ScrapeProgress {
            run_id,
            progress_type: ProgressType::Progress,
            pages_scraped: processed,
            total_pages: Some(total),
            articles_found: total,
            articles_new,
            articles_failed,
            current_article: Some(external_id.clone()),
            message: None,
        });

        // Scrape article
        match scraper.scrape_article(external_id).await {
            Ok(article) => {
                if exists {
                    queries::update_article(&pool, source_name, external_id, &article).await?;
                } else {
                    queries::insert_article(&pool, &article).await?;
                    articles_new += 1;
                }

                // Log progress every 50 articles
                if articles_new % 50 == 0 {
                    tracing::info!(
                        "smol.ai: Progress: {}/{} processed, {} new, {} failed",
                        processed, total, articles_new, articles_failed
                    );
                }
            }
            Err(e) => {
                tracing::error!("smol.ai: Failed to scrape article {}: {}", external_id, e);
                articles_failed += 1;
            }
        }

        // Update database progress every 20 articles
        if processed % 20 == 0 {
            queries::update_scrape_run_progress(
                &pool,
                run_id,
                processed,
                total,
                articles_new,
                articles_failed,
            )
            .await?;
        }
    }

    // Final update
    queries::update_scrape_run_progress(
        &pool,
        run_id,
        processed,
        total,
        articles_new,
        articles_failed,
    )
    .await?;

    tracing::info!(
        "smol.ai scrape complete: {}/{} processed, {} new, {} failed",
        processed, total, articles_new, articles_failed
    );

    Ok(())
}

pub async fn stop_scrape(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let run = queries::get_running_scrape(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match run {
        Some(run) => {
            *CANCEL_FLAG.lock().await = Some(run.id);
            queries::complete_scrape_run(&state.pool, run.id, ScrapeStatus::Cancelled)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            Ok(Json(serde_json::json!({
                "message": "Scrape cancelled",
                "run_id": run.id
            })))
        }
        None => Err((StatusCode::NOT_FOUND, "No scrape running".to_string())),
    }
}

pub async fn get_status(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ScrapeStatusResponse>, (StatusCode, String)> {
    let run = queries::get_running_scrape(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ScrapeStatusResponse {
        running: run.is_some(),
        current_run: run,
    }))
}

#[derive(Debug, Deserialize)]
pub struct ListRunsQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    20
}

pub async fn list_runs(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListRunsQuery>,
) -> Result<Json<Vec<ScrapeRun>>, (StatusCode, String)> {
    let runs = queries::get_scrape_runs(&state.pool, query.limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(runs))
}
