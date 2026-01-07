import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Newspaper, Bot, Settings, Globe, Zap, Sun, Moon, Monitor, BookOpen, Video, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import Dashboard from '@/pages/Dashboard'
import Articles from '@/pages/Articles'
import ArticleDetail from '@/pages/ArticleDetail'
import Scraper from '@/pages/Scraper'
import SettingsPage from '@/pages/Settings'
import Knowledge from '@/pages/Knowledge'
import KnowledgeDetail from '@/pages/KnowledgeDetail'
import Collage from '@/pages/Collage'
import Billing from '@/pages/Billing'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/articles', label: 'Articles', icon: Newspaper },
  { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { path: '/collage', label: 'Video Collage', icon: Video },
  { path: '/scraper', label: 'Scraper', icon: Bot },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          theme === 'light'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Light theme"
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          theme === 'dark'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Dark theme"
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          theme === 'system'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="System theme"
      >
        <Monitor className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-[hsl(var(--sidebar))]">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 glow">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold gradient-text">AIBase Scraper</h1>
          <p className="text-[10px] text-muted-foreground">News Aggregator</p>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]'
                  : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-green-500" />
          <span>System Online</span>
        </div>
      </div>
    </aside>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/knowledge/:slug" element={<KnowledgeDetail />} />
          <Route path="/collage" element={<Collage />} />
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
