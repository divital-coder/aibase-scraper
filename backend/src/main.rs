mod api;
mod config;
mod db;
mod scraper;

use anyhow::Result;
use axum::{
    routing::{get, patch, post},
    Router,
};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::api::handlers;
use crate::config::Config;
use crate::db::pool::create_pool;
use crate::scraper::ScrapeProgress;

pub struct AppState {
    pub pool: sqlx::PgPool,
    pub config: Config,
    pub progress_tx: broadcast::Sender<ScrapeProgress>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "aibase_scraper=debug,tower_http=debug,axum=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let pool = create_pool(&config.database_url).await?;

    // Run migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Migrations complete");

    let (progress_tx, _) = broadcast::channel::<ScrapeProgress>(100);

    let state = Arc::new(AppState {
        pool,
        config: config.clone(),
        progress_tx,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Articles
        .route("/api/articles", get(handlers::articles::list_articles))
        .route("/api/articles/:id", get(handlers::articles::get_article))
        .route("/api/articles/:id/delete", axum::routing::delete(handlers::articles::delete_article))
        // Scraper
        .route("/api/scraper/start", post(handlers::scraper::start_scrape))
        .route("/api/scraper/start-range", post(handlers::scraper::start_range_scrape))
        .route("/api/scraper/stop", post(handlers::scraper::stop_scrape))
        .route("/api/scraper/status", get(handlers::scraper::get_status))
        .route("/api/scraper/runs", get(handlers::scraper::list_runs))
        // Stats
        .route("/api/stats", get(handlers::stats::get_stats))
        .route("/api/stats/tags", get(handlers::stats::get_tag_stats))
        // Settings
        .route("/api/settings", get(handlers::settings::get_settings))
        .route("/api/settings/:key", patch(handlers::settings::update_setting))
        // WebSocket
        .route("/ws/scrape-progress", get(api::websocket::ws_handler))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    let addr = format!("{}:{}", config.server_host, config.server_port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
