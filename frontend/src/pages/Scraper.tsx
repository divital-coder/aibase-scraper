import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useScraperStatus, useScrapeRuns, useStartScrape, useStopScrape, useStartRangeScrape } from '@/hooks/useScraper'
import { useScrapeProgress } from '@/hooks/useWebSocket'
import { useSources } from '@/hooks/useArticles'
import { formatDateTime } from '@/lib/utils'
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Zap,
  FileText,
  AlertTriangle,
  Hash,
  Layers,
  Globe,
} from 'lucide-react'

export default function Scraper() {
  const [maxPages, setMaxPages] = useState('10')
  const [source, setSource] = useState('aibase')
  const [scrapeMode, setScrapeMode] = useState<'pagination' | 'range'>('range')
  const [scrapeType, setScrapeType] = useState<'incremental' | 'full'>('incremental')
  const [startId, setStartId] = useState('14000')
  const [endId, setEndId] = useState('24178')

  const { data: sources } = useSources()

  const { data: status } = useScraperStatus()
  const { data: runs } = useScrapeRuns(10)
  const startMutation = useStartScrape()
  const startRangeMutation = useStartRangeScrape()
  const stopMutation = useStopScrape()
  const { progress } = useScrapeProgress()

  const isRunning = status?.running

  const handleStart = () => {
    if (scrapeMode === 'range') {
      startRangeMutation.mutate({
        start_id: parseInt(startId) || 14000,
        end_id: parseInt(endId) || 24178,
        force_rescrape: false,
        source,
      })
    } else {
      startMutation.mutate({
        scrape_type: scrapeType,
        max_pages: parseInt(maxPages) || 10,
        source,
      })
    }
  }

  // When changing to smol.ai source, switch to pagination mode (range not supported)
  const handleSourceChange = (newSource: string) => {
    setSource(newSource)
    if (newSource !== 'aibase' && scrapeMode === 'range') {
      setScrapeMode('pagination')
    }
  }

  const isRangeSupported = source === 'aibase'

  const handleStop = () => {
    stopMutation.mutate()
  }

  const isPending = startMutation.isPending || startRangeMutation.isPending

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentProgress =
    isRunning && progress ? (progress.pages_scraped / (progress.total_pages || 100)) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scraper</h1>
        <p className="text-muted-foreground mt-1">Control and monitor your scraping jobs</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Start New Scrape
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Source
              </label>
              <div className="flex gap-2">
                {sources?.map((s) => (
                  <Button
                    key={s.id}
                    variant={source === s.id ? 'default' : 'outline'}
                    onClick={() => handleSourceChange(s.id)}
                    disabled={isRunning}
                    className={
                      source === s.id
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-secondary/30'
                    }
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Scrape Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={scrapeMode === 'range' ? 'default' : 'outline'}
                  onClick={() => setScrapeMode('range')}
                  disabled={isRunning || !isRangeSupported}
                  className={
                    scrapeMode === 'range'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-secondary/30'
                  }
                  title={!isRangeSupported ? 'ID Range mode only available for AIBase' : ''}
                >
                  <Hash className="h-4 w-4 mr-1" />
                  ID Range
                </Button>
                <Button
                  variant={scrapeMode === 'pagination' ? 'default' : 'outline'}
                  onClick={() => setScrapeMode('pagination')}
                  disabled={isRunning}
                  className={
                    scrapeMode === 'pagination'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-secondary/30'
                  }
                >
                  <Layers className="h-4 w-4 mr-1" />
                  {source === 'smolai' ? 'Archive' : 'Pagination'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {scrapeMode === 'range'
                  ? 'Scrape articles by ID range - best for initial data collection'
                  : source === 'smolai'
                  ? 'Scrape from archive page - discovers all issues'
                  : 'Scrape through listing pages - best for regular updates'}
              </p>
            </div>

            {scrapeMode === 'range' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start ID</label>
                    <Input
                      type="number"
                      value={startId}
                      onChange={(e) => setStartId(e.target.value)}
                      disabled={isRunning}
                      min={1}
                      className="bg-secondary/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End ID</label>
                    <Input
                      type="number"
                      value={endId}
                      onChange={(e) => setEndId(e.target.value)}
                      disabled={isRunning}
                      min={1}
                      className="bg-secondary/30 border-border"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scraping {Math.max(0, (parseInt(endId) || 0) - (parseInt(startId) || 0) + 1).toLocaleString()} article IDs
                  (skips non-existent articles)
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Scrape Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={scrapeType === 'incremental' ? 'default' : 'outline'}
                      onClick={() => setScrapeType('incremental')}
                      disabled={isRunning}
                      className={
                        scrapeType === 'incremental'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-secondary/30'
                      }
                    >
                      Incremental
                    </Button>
                    <Button
                      variant={scrapeType === 'full' ? 'default' : 'outline'}
                      onClick={() => setScrapeType('full')}
                      disabled={isRunning}
                      className={
                        scrapeType === 'full' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-secondary/30'
                      }
                    >
                      Full
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {scrapeType === 'incremental'
                      ? 'Stops when encountering existing articles - faster for updates'
                      : 'Scrapes all pages regardless of existing articles - use for full refresh'}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Max Pages</label>
                  <Input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                    disabled={isRunning}
                    min={1}
                    max={1000}
                    className="bg-secondary/30 border-border"
                  />
                  <p className="text-xs text-muted-foreground">Maximum number of pages to scrape (8 articles per page)</p>
                </div>
              </>
            )}

            {isRunning ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={stopMutation.isPending}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Scrape
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {scrapeMode === 'range'
                  ? 'Start Range Scrape'
                  : `Start ${sources?.find(s => s.id === source)?.name || source} Scrape`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 text-blue-400 ${isRunning ? 'animate-spin' : ''}`} />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRunning && progress ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {progress.pages_scraped} / {progress.total_pages || '?'} pages
                    </span>
                  </div>
                  <Progress value={currentProgress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <FileText className="h-3 w-3" />
                      Found
                    </div>
                    <div className="text-2xl font-bold">{progress.articles_found}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
                      <CheckCircle className="h-3 w-3" />
                      New
                    </div>
                    <div className="text-2xl font-bold text-green-400">{progress.articles_new}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Failed
                    </div>
                    <div className="text-2xl font-bold text-red-400">{progress.articles_failed}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Zap className="h-3 w-3" />
                      Current
                    </div>
                    <div className="text-sm font-mono truncate">
                      {progress.current_article || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="rounded-full bg-secondary/50 p-4 w-fit mx-auto mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No scrape running</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new scrape to see real-time progress
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-400" />
            Recent Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(run.status)}
                      <Badge variant="outline" className="text-xs">
                        {run.scrape_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(run.started_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Pages: </span>
                      <span className="font-medium">{run.pages_scraped || 0}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-400 font-medium">{run.articles_new || 0}</span>
                      <span className="text-muted-foreground"> new / </span>
                      <span className="text-red-400 font-medium">{run.articles_failed || 0}</span>
                      <span className="text-muted-foreground"> failed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No scrape runs yet - start your first scrape above
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
