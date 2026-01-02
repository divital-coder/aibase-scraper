use anyhow::{Context, Result};
use governor::{Quota, RateLimiter};
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::sleep;

pub struct ScraperClient {
    client: reqwest::Client,
    rate_limiter: Arc<RateLimiter<governor::state::NotKeyed, governor::state::InMemoryState, governor::clock::DefaultClock>>,
    max_retries: u32,
}

impl ScraperClient {
    pub fn new(requests_per_second: u32, max_retries: u32) -> Result<Self> {
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        let quota = Quota::per_second(NonZeroU32::new(requests_per_second).unwrap());
        let rate_limiter = Arc::new(RateLimiter::direct(quota));

        Ok(Self {
            client,
            rate_limiter,
            max_retries,
        })
    }

    pub async fn fetch(&self, url: &str) -> Result<String> {
        self.fetch_with_retry(url, self.max_retries).await
    }

    pub async fn fetch_with_retry(&self, url: &str, retries: u32) -> Result<String> {
        let mut last_error = None;

        for attempt in 0..=retries {
            // Wait for rate limiter
            self.rate_limiter.until_ready().await;

            match self.do_fetch(url).await {
                Ok(body) => return Ok(body),
                Err(e) => {
                    last_error = Some(e);
                    if attempt < retries {
                        let backoff = Duration::from_millis(1000 * (2_u64.pow(attempt)));
                        tracing::warn!(
                            "Request failed (attempt {}/{}), retrying in {:?}: {}",
                            attempt + 1,
                            retries + 1,
                            backoff,
                            url
                        );
                        sleep(backoff).await;
                    }
                }
            }
        }

        Err(last_error.unwrap())
    }

    async fn do_fetch(&self, url: &str) -> Result<String> {
        let response = self.client.get(url).send().await.context("HTTP request failed")?;

        let status = response.status();
        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            // Check for Retry-After header
            if let Some(retry_after) = response.headers().get("retry-after") {
                if let Ok(seconds) = retry_after.to_str().unwrap_or("60").parse::<u64>() {
                    tracing::warn!("Rate limited, waiting {} seconds", seconds);
                    sleep(Duration::from_secs(seconds)).await;
                }
            }
            anyhow::bail!("Rate limited (429)");
        }

        if !status.is_success() {
            anyhow::bail!("HTTP error: {}", status);
        }

        let body = response.text().await.context("Failed to read response body")?;
        Ok(body)
    }
}
