import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useArticle } from '@/hooks/useArticles'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, ExternalLink, Calendar, User, Clock, Eye, Globe } from 'lucide-react'
import DOMPurify from 'dompurify'

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: article, isLoading, error } = useArticle(id || '')

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Link to="/articles">
          <Button variant="ghost" className="text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Articles
          </Button>
        </Link>
        <Card className="bg-card/50">
          <CardContent className="py-16 text-center">
            <div className="rounded-full bg-secondary p-4 w-fit mx-auto mb-4">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Article not found</h3>
            <p className="text-muted-foreground">
              The article you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if content looks like HTML
  const isHtmlContent = article.content.includes('<') && article.content.includes('>')
  const sanitizedContent = isHtmlContent
    ? DOMPurify.sanitize(article.content, {
        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 'pre', 'blockquote', 'hr', 'br', 'img', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'id']
      })
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/articles">
        <Button variant="ghost" className="text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Articles
        </Button>
      </Link>

      <article>
        <h1 className="text-3xl font-bold tracking-tight mb-6">{article.title}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-8 p-4 rounded-lg bg-secondary/20">
          {article.published_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              {formatDateTime(article.published_at)}
            </div>
          )}
          {article.author && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-400" />
              {article.author}
            </div>
          )}
          {article.read_time_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-400" />
              {article.read_time_minutes} min read
            </div>
          )}
          {article.view_count && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-400" />
              {article.view_count.toLocaleString()} views
            </div>
          )}
        </div>

        <Card className="card-glow bg-card/50 backdrop-blur mb-8">
          <CardContent className="py-8 px-8">
            {isHtmlContent ? (
              <div
                className="prose dark:prose-invert max-w-none
                  prose-headings:text-foreground prose-headings:font-semibold
                  prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
                  prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-4
                  prose-a:text-blue-400 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-300
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-purple-400 prose-code:bg-secondary/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-secondary/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg
                  prose-blockquote:border-l-4 prose-blockquote:border-blue-500/50 prose-blockquote:bg-secondary/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-foreground/80
                  prose-ul:my-4 prose-ul:text-foreground/90
                  prose-ol:my-4 prose-ol:text-foreground/90
                  prose-li:my-1 prose-li:marker:text-muted-foreground
                  prose-hr:border-border/50 prose-hr:my-8
                  prose-img:rounded-lg prose-img:max-h-80 prose-img:mx-auto"
                dangerouslySetInnerHTML={{ __html: sanitizedContent || '' }}
              />
            ) : (
              <div className="prose max-w-none">
                {article.content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="mb-4 last:mb-0 text-foreground/90 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Original Article
            </Button>
          </a>

          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground/60">Scraped: </span>
            {formatDateTime(article.scraped_at)}
          </div>
        </div>
      </article>
    </div>
  )
}
