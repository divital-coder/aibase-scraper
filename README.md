# AIBase Scraper

**A high-performance web scraper for [AIBase News](https://news.aibase.com) built with Rust and React. Features incremental scraping, full-text search, real-time progress tracking, and a modern dark-themed UI.**

## Technical Architecture

The system follows a three-tier architecture:

### 1. Backend (Rust)
High-performance async scraper with rate limiting.

| Component | Technology |
|-----------|------------|
| Web Framework | Axum |
| HTTP Client | reqwest |
| HTML Parser | scraper |
| Database | sqlx (PostgreSQL) |
| Rate Limiter | governor |

### 2. Database (PostgreSQL)
Full-text search with tsvector indexing.

| Feature | Implementation |
|---------|----------------|
| Full-text Search | GIN index on tsvector |
| Deduplication | Unique constraint on external_id |
| Migrations | sqlx-migrate |

### 3. Frontend (React)
Modern SPA with real-time updates.

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Build Tool | Vite |
| UI Framework | React 18 |
| Components | shadcn/ui |
| State | TanStack Query |
| Real-time | WebSocket |

## Installation

From the root of the repository, run:

```bash
git clone https://github.com/divital-coder/aibase-scraper.git
cd aibase-scraper
```

### Prerequisites

- Rust 1.75+
- Bun 1.0+
- Docker and Docker Compose

## Usage

The repository consists of three main components that need to be started in order:

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Run the Backend

```bash
cd backend
cargo run --release
```

The backend will start on `http://localhost:3001`

### 3. Run the Frontend

```bash
cd frontend
bun install
bun dev --port 3002
```

The frontend will start on `http://localhost:3002`

## Scraping Modes

### Pagination Mode
Scrapes articles from listing pages. Best for regular updates.

```bash
curl -X POST http://localhost:3001/api/scraper/start \
  -H "Content-Type: application/json" \
  -d '{"scrape_type": "incremental", "max_pages": 10}'
```

### ID Range Mode
Scrapes articles by ID range. Best for initial data collection.

```bash
curl -X POST http://localhost:3001/api/scraper/start-range \
  -H "Content-Type: application/json" \
  -d '{"start_id": 14000, "end_id": 24178}'
```

## API Reference

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | List articles with pagination and search |
| GET | `/api/articles/:id` | Get single article by ID |
| DELETE | `/api/articles/:id` | Delete article |

**Query Parameters for listing:**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `search` - Full-text search query
- `tag` - Filter by tag

### Scraper

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scraper/start` | Start pagination scrape |
| POST | `/api/scraper/start-range` | Start ID range scrape |
| POST | `/api/scraper/stop` | Stop current job |
| GET | `/api/scraper/status` | Get current job status |
| GET | `/api/scraper/runs` | List past scrape runs |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/stats/tags` | Tag distribution |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| PATCH | `/api/settings/:key` | Update setting |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /ws/scrape-progress` | Real-time scrape progress |

## Configuration

Environment variables (`backend/.env`):

```bash
# Database
DATABASE_URL=postgres://scraper:scraper_password@localhost:5432/aibase_scraper

# Server
SERVER_HOST=127.0.0.1
SERVER_PORT=3001

# Scraper
SCRAPER_RATE_LIMIT=2        # Requests per second
SCRAPER_MAX_RETRIES=3       # Retry attempts on failure

# Logging
RUST_LOG=info,aibase_scraper=debug
```

## Development

### Backend Development

```bash
cd backend
cargo watch -x run    # Auto-reload on changes
cargo build --release # Production build
```

### Frontend Development

```bash
cd frontend
bun dev              # Vite dev server with HMR
bun run build        # Production build
bun run preview      # Preview production build
```

### Database Management

```bash
# Reset database
docker compose down -v
docker compose up -d

# View logs
docker compose logs -f postgres
```

## Performance

| Metric | Value |
|--------|-------|
| Rate Limit | 2 requests/second |
| Max Range | 50,000 articles/run |
| Estimated Time (10k articles) | ~85 minutes |

The scraper handles 404s gracefully and skips non-existent article IDs automatically.

## License

MIT
