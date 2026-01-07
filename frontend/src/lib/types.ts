export interface Article {
  id: string
  external_id: string
  url: string
  title: string
  content: string
  excerpt: string | null
  author: string | null
  source: string | null
  published_at: string | null
  view_count: number | null
  read_time_minutes: number | null
  thumbnail_url: string | null
  tags?: string[]
  scraped_at: string
  updated_at: string
}

export interface ArticlePreview {
  id: string
  external_id: string
  title: string
  excerpt: string | null
  published_at: string | null
  thumbnail_url: string | null
  view_count: number | null
  tags: string[]
  source: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ScrapeRun {
  id: string
  scrape_type: 'full' | 'incremental' | 'single'
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  total_pages: number | null
  pages_scraped: number | null
  articles_found: number | null
  articles_new: number | null
  articles_updated: number | null
  articles_failed: number | null
  started_at: string
  completed_at: string | null
  last_error: string | null
  error_count: number | null
}

export interface ScrapeProgress {
  run_id: string
  progress_type: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled'
  pages_scraped: number
  total_pages: number | null
  articles_found: number
  articles_new: number
  articles_failed: number
  current_article: string | null
  message: string | null
}

export interface Stats {
  total_articles: number
  articles_today: number
  articles_this_week: number
  last_scrape: string | null
  total_scrape_runs: number
}

export interface TagStat {
  name: string
  count: number
}

export interface ScraperSetting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}

export interface SourceInfo {
  id: string
  name: string
  base_url: string
}
