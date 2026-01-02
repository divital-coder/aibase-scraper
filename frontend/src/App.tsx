import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Newspaper, Bot, Settings, Globe, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import Dashboard from '@/pages/Dashboard'
import Articles from '@/pages/Articles'
import ArticleDetail from '@/pages/ArticleDetail'
import Scraper from '@/pages/Scraper'
import SettingsPage from '@/pages/Settings'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/articles', label: 'Articles', icon: Newspaper },
  { path: '/scraper', label: 'Scraper', icon: Bot },
  { path: '/settings', label: 'Settings', icon: Settings },
]

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
                  ? 'bg-[hsl(var(--sidebar-accent))] text-white'
                  : 'text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
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
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
