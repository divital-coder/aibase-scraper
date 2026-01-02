use anyhow::{Context, Result};

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub server_host: String,
    pub server_port: u16,
    pub scraper_rate_limit: u32,
    pub scraper_max_retries: u32,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")
                .context("DATABASE_URL must be set")?,
            server_host: std::env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: std::env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .context("SERVER_PORT must be a valid port number")?,
            scraper_rate_limit: std::env::var("SCRAPER_RATE_LIMIT")
                .unwrap_or_else(|_| "2".to_string())
                .parse()
                .context("SCRAPER_RATE_LIMIT must be a number")?,
            scraper_max_retries: std::env::var("SCRAPER_MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .context("SCRAPER_MAX_RETRIES must be a number")?,
        })
    }
}
