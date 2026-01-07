import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  KNOWLEDGE_FILES,
  GITHUB_REPO_URL,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type KnowledgeFile,
} from '@/lib/knowledge'
import { Search, ExternalLink, BookOpen, Filter } from 'lucide-react'

const CATEGORIES = ['all', 'main', 'projects', 'learning', 'tools', 'personal'] as const
type Category = (typeof CATEGORIES)[number]

export default function Knowledge() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('all')

  const filteredFiles = useMemo(() => {
    return KNOWLEDGE_FILES.filter((file) => {
      const matchesSearch =
        search === '' ||
        file.title.toLowerCase().includes(search.toLowerCase()) ||
        file.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'all' || file.category === category
      return matchesSearch && matchesCategory
    })
  }, [search, category])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">
            Personal knowledge repository and notes
          </p>
        </div>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </Button>
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
              className={category === cat ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as KnowledgeFile['category']]}
            </Button>
          ))}
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-16 text-center">
            <div className="rounded-full bg-secondary p-4 w-fit mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No files found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => (
            <Link key={file.slug} to={`/knowledge/${file.slug}`}>
              <Card className="card-glow h-full transition-all duration-300 bg-card/50 backdrop-blur hover:bg-card/70 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[file.category]}`}
                    >
                      {CATEGORY_LABELS[file.category]}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                    {file.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {file.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
        <p>
          Source:{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            divital-coder/social_presence
          </a>
        </p>
      </div>
    </div>
  )
}
