import { Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStats, useTagStats } from '@/hooks/useStats'
import { useArticles } from '@/hooks/useArticles'
import { useDateTime } from '@/hooks/useDateTime'
import { formatDateTime, formatDate } from '@/lib/utils'
import { Newspaper, Calendar, TrendingUp, Clock, ExternalLink, Tag, Play, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Lazy load the shader to avoid blocking initial render
const HeadShader = lazy(() => import('@/components/HeadShader'))

const CHART_COLORS = [
  'hsl(250, 80%, 60%)',
  'hsl(280, 70%, 55%)',
  'hsl(320, 70%, 55%)',
  'hsl(200, 70%, 55%)',
  'hsl(160, 70%, 50%)',
]

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  loading?: boolean
  subtitle?: string
}) {
  return (
    <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 p-3">
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: tagStats, isLoading: tagsLoading } = useTagStats()
  const { data: recentArticles, isLoading: articlesLoading } = useArticles({ per_page: 5 })
  const { time, date } = useDateTime()

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* 3D Shader Background */}
      <div className="absolute top-0 right-0 w-[40%] h-full hidden xl:block overflow-visible rounded-l-3xl">
        <Suspense fallback={null}>
          <HeadShader />
        </Suspense>
        {/* Gradient overlay for smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent pointer-events-none" />
      </div>

      {/* Dashboard Content */}
      <div className="relative z-10 space-y-8 animate-fade-in xl:pr-[35%]">
        {/* Greeting and Date/Time Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <span className="text-lg text-muted-foreground">Howdy!</span>
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Twelve-Labs Geek
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-orange-400">It's 2026 Div~</p>
              <p className="text-lg font-bold bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
                Get to work hun
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-6">
            <div className="text-5xl sm:text-6xl font-bold tracking-tight tabular-nums bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {time}
            </div>
            <div className="text-lg text-muted-foreground pb-1">
              {date}
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your scraped news articles</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 stagger-children">
          <StatCard
            title="Total Articles"
            value={stats?.total_articles.toLocaleString() || '0'}
            icon={Newspaper}
            loading={statsLoading}
          />
          <StatCard
            title="Added Today"
            value={stats?.articles_today || 0}
            icon={Calendar}
            loading={statsLoading}
          />
          <StatCard
            title="This Week"
            value={stats?.articles_this_week || 0}
            icon={TrendingUp}
            loading={statsLoading}
          />
          <StatCard
            title="Last Scrape"
            value={stats?.last_scrape ? formatDateTime(stats.last_scrape).split(',')[0] : 'Never'}
            icon={Clock}
            loading={statsLoading}
            subtitle={stats?.last_scrape ? formatDateTime(stats.last_scrape).split(',')[1] : undefined}
          />
        </div>

        {/* Inspiration Board Video Collage */}
        <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Play className="h-4 w-4 text-green-400" />
                Inspiration Board
              </CardTitle>
              <Link
                to="/collage"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage Collage
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-video bg-black/50">
              <video
                src="/inspiration-collage.mp4"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <p className="text-sm text-white/80">
                  Your curated video inspiration collage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-400" />
                Top Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : tagStats && tagStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={tagStats.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: 'hsl(0, 0%, 70%)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {tagStats.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No tags yet - run a scrape first
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-purple-400" />
                  Recent Articles
                </CardTitle>
                <Link
                  to="/articles"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentArticles?.data && recentArticles.data.length > 0 ? (
                <div className="space-y-3">
                  {recentArticles.data.map((article) => (
                    <Link
                      key={article.id}
                      to={`/articles/${article.id}`}
                      className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(article.published_at)}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No articles yet - run a scrape first
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
