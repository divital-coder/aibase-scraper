-- Create scraper settings

CREATE TABLE scraper_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO scraper_settings (key, value) VALUES
    ('rate_limit', '{"requests_per_second": 2, "burst": 5}'::jsonb),
    ('retry', '{"max_retries": 3, "backoff_ms": 1000}'::jsonb),
    ('schedule', '{"enabled": false, "cron": "0 */6 * * *"}'::jsonb),
    ('pagination', '{"max_pages": 100, "stop_on_existing": true}'::jsonb);
