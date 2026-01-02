-- Create scrape runs tracking

CREATE TYPE scrape_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
CREATE TYPE scrape_type AS ENUM ('full', 'incremental', 'single');

CREATE TABLE scrape_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scrape_type scrape_type NOT NULL,
    status scrape_status NOT NULL DEFAULT 'running',

    total_pages INTEGER,
    pages_scraped INTEGER DEFAULT 0,
    articles_found INTEGER DEFAULT 0,
    articles_new INTEGER DEFAULT 0,
    articles_updated INTEGER DEFAULT 0,
    articles_failed INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    config JSONB
);

CREATE TABLE scrape_article_logs (
    id SERIAL PRIMARY KEY,
    run_id UUID REFERENCES scrape_runs(id) ON DELETE CASCADE,
    external_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scrape_runs_started_at ON scrape_runs(started_at DESC);
CREATE INDEX idx_scrape_runs_status ON scrape_runs(status);
CREATE INDEX idx_scrape_article_logs_run_id ON scrape_article_logs(run_id);
