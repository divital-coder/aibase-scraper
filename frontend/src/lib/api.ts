import type {
  Article,
  ArticlePreview,
  PaginatedResponse,
  ScrapeRun,
  ScraperSetting,
  Stats,
  TagStat,
} from './types'

const API_BASE = '/api'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Articles
export async function getArticles(params: {
  page?: number
  per_page?: number
  search?: string
  tag?: string
}): Promise<PaginatedResponse<ArticlePreview>> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.search) searchParams.set('search', params.search)
  if (params.tag) searchParams.set('tag', params.tag)

  const query = searchParams.toString()
  return fetchApi(`/articles${query ? `?${query}` : ''}`)
}

export async function getArticle(id: string): Promise<Article> {
  return fetchApi(`/articles/${id}`)
}

export async function deleteArticle(id: string): Promise<void> {
  return fetchApi(`/articles/${id}/delete`, { method: 'DELETE' })
}

// Scraper
export async function startScrape(params: {
  scrape_type?: 'full' | 'incremental'
  max_pages?: number
  force_rescrape?: boolean
}): Promise<{ run_id: string; message: string }> {
  return fetchApi('/scraper/start', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function stopScrape(): Promise<{ message: string; run_id: string }> {
  return fetchApi('/scraper/stop', { method: 'POST' })
}

export async function startRangeScrape(params: {
  start_id: number
  end_id: number
  force_rescrape?: boolean
}): Promise<{ run_id: string; message: string }> {
  return fetchApi('/scraper/start-range', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getScraperStatus(): Promise<{
  running: boolean
  current_run: ScrapeRun | null
}> {
  return fetchApi('/scraper/status')
}

export async function getScrapeRuns(limit?: number): Promise<ScrapeRun[]> {
  const query = limit ? `?limit=${limit}` : ''
  return fetchApi(`/scraper/runs${query}`)
}

// Stats
export async function getStats(): Promise<Stats> {
  return fetchApi('/stats')
}

export async function getTagStats(): Promise<TagStat[]> {
  return fetchApi('/stats/tags')
}

// Settings
export async function getSettings(): Promise<ScraperSetting[]> {
  return fetchApi('/settings')
}

export async function updateSetting(
  key: string,
  value: Record<string, unknown>
): Promise<{ message: string }> {
  return fetchApi(`/settings/${key}`, {
    method: 'PATCH',
    body: JSON.stringify(value),
  })
}
