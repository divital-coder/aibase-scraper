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

### 4. Knowledge Base

The frontend includes a Knowledge Base section that displays markdown notes from the [social_presence](https://github.com/divital-coder/social_presence) repository via symlink.

| Feature | Technology |
|---------|------------|
| Rendering | react-markdown |
| GFM Support | remark-gfm |
| Symlink | /public/knowledge -> social_presence |

**Setup Knowledge Base (optional):**

```bash
# Clone the social_presence repo
git clone https://github.com/divital-coder/social_presence ~/Desktop/social_presence

# Create symlink in frontend
ln -s ~/Desktop/social_presence frontend/public/knowledge
```

## Prerequisites

Before starting, ensure you have the following installed:

- [Rust](https://rustup.rs/) 1.75+
- [Bun](https://bun.sh/) 1.0+
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Quick Start

Follow these steps in order to get the application running:

### Step 1: Clone the Repository

```bash
git clone https://github.com/divital-coder/aibase-scraper.git
cd aibase-scraper
```

### Step 2: Start the PostgreSQL Database

The database runs in a Docker container. Start it with:

```bash
docker compose up -d
```

Verify it's running:

```bash
docker ps
# Should show: aibase-scraper-db running on port 5432
```

### Step 3: Configure Environment Variables

Copy the example environment file for the backend:

```bash
cp .env.example backend/.env
```

The default configuration works out of the box with the Docker PostgreSQL setup.

### Step 4: Start the Backend Server

Open a terminal and run:

```bash
cd backend
cargo run --release
```

Wait for the message:

```
INFO aibase_scraper: Server listening on 127.0.0.1:3001
```

The backend is now running at `http://localhost:3001`

### Step 5: Start the Frontend

Open a new terminal and run:

```bash
cd frontend
bun install
bun dev --port 3002
```

The frontend is now running at `http://localhost:3002`

### Step 6: Open the Application

Open your browser and navigate to:

```
http://localhost:3002
```

You should see the dashboard. Navigate to the **Scraper** page to start collecting articles.

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

## Stopping the Application

### Stop Frontend
Press `Ctrl+C` in the frontend terminal.

### Stop Backend
Press `Ctrl+C` in the backend terminal.

### Stop Database

```bash
# Stop but keep data
docker compose stop

# Stop and remove all data
docker compose down -v
```

## Restarting After a Break

If you've stopped the application and want to restart:

```bash
# 1. Start database (from project root)
docker compose up -d

# 2. Start backend (in one terminal)
cd backend && cargo run --release

# 3. Start frontend (in another terminal)
cd frontend && bun dev --port 3002
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

## Troubleshooting

### "Address already in use" Error

Kill the process using the port:

```bash
# For backend (port 3001)
lsof -ti :3001 | xargs kill -9

# For frontend (port 3002)
lsof -ti :3002 | xargs kill -9
```

### Database Connection Failed

Ensure PostgreSQL is running:

```bash
docker compose up -d
docker ps  # Verify container is running
```

### Frontend Can't Connect to Backend

Check that the backend is running and accessible:

```bash
curl http://localhost:3001/api/stats
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
