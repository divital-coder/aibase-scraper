import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getSettings, updateSetting } from '@/lib/api'
import { Settings as SettingsIcon, Save, Gauge, RefreshCw, Clock, Layers, AlertTriangle } from 'lucide-react'

const settingsConfig: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  rate_limit: {
    title: 'Rate Limiting',
    description: 'Control how fast the scraper makes requests to avoid being blocked',
    icon: Gauge,
  },
  retry: {
    title: 'Retry Configuration',
    description: 'Settings for retrying failed requests with exponential backoff',
    icon: RefreshCw,
  },
  schedule: {
    title: 'Scheduled Scraping',
    description: 'Configure automatic scraping schedule using cron expressions',
    icon: Clock,
  },
  pagination: {
    title: 'Pagination Settings',
    description: 'Control pagination behavior and limits',
    icon: Layers,
  },
}

export default function Settings() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      updateSetting(key, value),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSavedKey(variables.key)
      setTimeout(() => setSavedKey(null), 2000)
      setFormData((prev) => ({ ...prev, [variables.key]: '' }))
    },
  })

  const handleSave = (key: string, currentValue: Record<string, unknown>) => {
    try {
      const newValue = formData[key] ? JSON.parse(formData[key]) : currentValue
      updateMutation.mutate({ key, value: newValue })
    } catch {
      alert('Invalid JSON format')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your scraper behavior</p>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your scraper behavior</p>
      </div>

      <div className="grid gap-4">
        {settings?.map((setting) => {
          const config = settingsConfig[setting.key] || {
            title: setting.key,
            description: '',
            icon: SettingsIcon,
          }
          const Icon = config.icon

          return (
            <Card key={setting.key} className="card-glow transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-400" />
                  {config.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="font-mono text-sm bg-secondary/30 p-4 rounded-lg overflow-x-auto border border-border">
                  <pre className="text-foreground/80">{JSON.stringify(setting.value, null, 2)}</pre>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new JSON value to update..."
                    value={formData[setting.key] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [setting.key]: e.target.value }))
                    }
                    className="font-mono text-sm bg-secondary/30 border-border"
                  />
                  <Button
                    onClick={() => handleSave(setting.key, setting.value as Record<string, unknown>)}
                    disabled={updateMutation.isPending || !formData[setting.key]}
                    className={
                      savedKey === setting.key
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savedKey === setting.key ? 'Saved!' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-red-500/30 bg-red-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">Irreversible and destructive actions</p>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            disabled
            className="bg-red-600/50 hover:bg-red-600 cursor-not-allowed"
          >
            Clear All Articles
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This action is not yet implemented for safety
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
