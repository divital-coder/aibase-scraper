# AIBase Scraper

A web scraper for https://news.aibase.com with a Rust backend, PostgreSQL database, and React frontend.

## Features

- Discover and scrape articles from AIBase news
- Incremental scraping (only fetches new articles)
- Full-text search across all articles
- Real-time scrape progress via WebSocket
- Dashboard with statistics
- Configurable rate limiting and settings

## Tech Stack

- **Backend**: Rust (Axum, reqwest, scraper, sqlx)
- **Database**: PostgreSQL with full-text search
- **Frontend**: Bun + Vite + React + shadcn/ui

## Prerequisites

- Rust (1.75+)
- Bun (1.0+)
- Docker and Docker Compose
- PostgreSQL (or use Docker)

## Getting Started

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Run the Backend

```bash
cd backend
cp ../.env.example .env
cargo run
```

The backend will start on http://localhost:3001

### 3. Run the Frontend

```bash
cd frontend
bun install
bun dev
```

The frontend will start on http://localhost:3000

## API Endpoints

### Articles
- `GET /api/articles` - List articles with pagination and search
- `GET /api/articles/:id` - Get single article
- `DELETE /api/articles/:id` - Delete article

### Scraper
- `POST /api/scraper/start` - Start scraping job
- `POST /api/scraper/stop` - Stop current job
- `GET /api/scraper/status` - Get current job status
- `GET /api/scraper/runs` - List past scrape runs

### Statistics
- `GET /api/stats` - Dashboard statistics
- `GET /api/stats/tags` - Tag distribution

### Settings
- `GET /api/settings` - Get all settings
- `PATCH /api/settings/:key` - Update setting

### WebSocket
- `WS /ws/scrape-progress` - Real-time scrape progress

## Usage

1. Open http://localhost:3000
2. Go to the Scraper page
3. Configure max pages and scrape type
4. Click "Start Scrape"
5. Watch real-time progress
6. Browse articles in the Articles page

## Configuration

Environment variables (backend/.env):

```
DATABASE_URL=postgres://scraper:scraper_password@localhost:5432/aibase_scraper
RUST_LOG=info,aibase_scraper=debug
SERVER_HOST=127.0.0.1
SERVER_PORT=3001
SCRAPER_RATE_LIMIT=2
SCRAPER_MAX_RETRIES=3
```

## Development

### Backend

```bash
cd backend
cargo watch -x run  # Auto-reload on changes
```

### Frontend

```bash
cd frontend
bun dev  # Vite dev server with HMR
```

## License

MIT
