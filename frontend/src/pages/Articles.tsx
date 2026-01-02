import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useArticles } from '@/hooks/useArticles'
import { formatDate, truncate } from '@/lib/utils'
import { Search, ChevronLeft, ChevronRight, ExternalLink, ImageOff } from 'lucide-react'

export default function Articles() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const perPage = 9

  const { data, isLoading } = useArticles({ page, per_page: perPage, search: search || undefined })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground mt-1">
            {data?.pagination.total.toLocaleString() || 0} articles in database
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-64 pl-9 bg-secondary/30 border-border focus:border-blue-500/50"
            />
          </div>
          <Button type="submit" variant="secondary" className="shrink-0">
            Search
          </Button>
        </form>
      </div>

      {search && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span className="text-sm">
            Showing results for: <span className="font-semibold text-blue-400">{search}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setSearchInput('')
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-0">
                <Skeleton className="h-40 w-full rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-secondary p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No articles found</h3>
              <p className="text-muted-foreground max-w-sm">
                {search
                  ? 'Try a different search term or clear your search'
                  : 'Run the scraper to fetch articles from AIBase'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {data?.data.map((article) => (
              <Link key={article.id} to={`/articles/${article.id}`}>
                <Card className="h-full card-glow transition-all duration-300 bg-card/50 backdrop-blur overflow-hidden group cursor-pointer">
                  <CardContent className="p-0">
                    {article.thumbnail_url ? (
                      <div className="h-40 overflow-hidden bg-secondary">
                        <img
                          src={article.thumbnail_url}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden h-40 flex items-center justify-center bg-secondary">
                          <ImageOff className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-600/10">
                        <div className="text-4xl font-bold text-blue-500/30">
                          {article.title.charAt(0)}
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {truncate(article.excerpt, 100)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(article.published_at)}
                        </span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {article.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {data && data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-secondary/30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{page}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-sm text-muted-foreground">{data.pagination.total_pages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.total_pages, p + 1))}
                disabled={page === data.pagination.total_pages}
                className="bg-secondary/30"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
