import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useStats, useTagStats } from '@/hooks/useStats'
import { useArticles } from '@/hooks/useArticles'
import { formatDateTime, formatDate } from '@/lib/utils'
import { Newspaper, Calendar, TrendingUp, Clock, ExternalLink, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your scraped news articles</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
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
                      background: 'hsl(0, 0%, 12%)',
                      border: '1px solid hsl(0, 0%, 20%)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(0, 0%, 98%)' }}
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
                className="text-sm text-muted-foreground hover:text-white transition-colors"
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
  )
}
