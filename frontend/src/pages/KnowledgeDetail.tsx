import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useKnowledgeContent } from '@/hooks/useKnowledge'
import {
  getKnowledgeFile,
  getGitHubFileUrl,
  getGitHubEditUrl,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/lib/knowledge'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { ArrowLeft, ExternalLink, Edit, BookOpen } from 'lucide-react'

export default function KnowledgeDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: content, isLoading, error } = useKnowledgeContent(slug || '')
  const file = slug ? getKnowledgeFile(slug) : undefined

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Link to="/knowledge">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
        <Card className="bg-card/50">
          <CardContent className="py-16 text-center">
            <div className="rounded-full bg-secondary p-4 w-fit mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">File not found</h3>
            <p className="text-muted-foreground">
              The knowledge file you're looking for doesn't exist or couldn't be loaded.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/knowledge">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          {file && (
            <div
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-3 ${CATEGORY_COLORS[file.category]}`}
            >
              {CATEGORY_LABELS[file.category]}
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {file?.title || slug}
          </h1>
          {file?.description && (
            <p className="text-muted-foreground mt-1">{file.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={slug ? getGitHubFileUrl(slug) : '#'}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View
            </Button>
          </a>
          <a
            href={slug ? getGitHubEditUrl(slug) : '#'}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </a>
        </div>
      </div>

      <Card className="card-glow bg-card/50 backdrop-blur">
        <CardContent className="py-8 px-8">
          <MarkdownRenderer content={content} />
        </CardContent>
      </Card>
    </div>
  )
}
