import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Download,
  RefreshCw,
  Plus,
  Video,
  Loader2,
  ExternalLink,
  Grid3X3,
  LayoutGrid,
  Columns,
  SquareStack,
  Package,
} from 'lucide-react'

const LAYOUTS = [
  { value: 'dynamic', label: 'Dynamic', icon: LayoutGrid, description: 'Row-based, preserves aspect ratios' },
  { value: 'grid', label: 'Grid', icon: Grid3X3, description: 'Uniform cells in rows/columns' },
  { value: 'masonry', label: 'Masonry', icon: Columns, description: 'Pinterest-style vertical columns' },
  { value: 'treemap', label: 'Treemap', icon: SquareStack, description: 'Space-filling algorithm' },
  { value: 'pack', label: 'Pack', icon: Package, description: 'Bin-packing for mixed sizes' },
]

const PRESETS = [
  { value: 'ultrafast', label: 'Ultra Fast', description: 'Quick preview' },
  { value: 'fast', label: 'Fast', description: 'Good balance' },
  { value: 'balanced', label: 'Balanced', description: 'Default quality' },
  { value: 'quality', label: 'Quality', description: 'Better quality' },
  { value: 'best', label: 'Best', description: 'Maximum quality' },
]

const SHADERS = [
  { value: 'none', label: 'None' },
  { value: 'vignette', label: 'Vignette' },
  { value: 'bloom', label: 'Bloom' },
  { value: 'chromatic', label: 'Chromatic' },
  { value: 'noise', label: 'Film Grain' },
  { value: 'crt', label: 'CRT' },
  { value: 'dreamy', label: 'Dreamy' },
]

export default function Collage() {
  const [urls, setUrls] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [layout, setLayout] = useState('dynamic')
  const [preset, setPreset] = useState('balanced')
  const [shader, setShader] = useState('none')
  const [duration, setDuration] = useState('60')
  const [useGpu, setUseGpu] = useState(false)

  // Note: This component is a UI mockup for the video-collage CLI integration
  // The actual CLI commands would need to be executed via a backend API

  const handleDownload = async () => {
    if (!urls.trim()) return
    setIsLoading(true)
    setOutput((prev) => [...prev, `Downloading: ${urls}`])

    // Simulate download (in real implementation, this would call backend API)
    setTimeout(() => {
      setOutput((prev) => [...prev, 'Download complete!'])
      setUrls('')
      setIsLoading(false)
      // Would refresh media list here
    }, 2000)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const cmd = [
      'video-collage generate',
      `--layout ${layout}`,
      `--preset ${preset}`,
      `--duration ${duration}`,
      shader !== 'none' ? `--shader ${shader}` : '',
      useGpu ? '--gpu' : '',
    ]
      .filter(Boolean)
      .join(' ')

    setOutput((prev) => [...prev, `Running: ${cmd}`])

    // Simulate generation (in real implementation, this would call backend API)
    setTimeout(() => {
      setOutput((prev) => [...prev, 'Collage generated successfully!'])
      setIsGenerating(false)
    }, 3000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Collage</h1>
          <p className="text-muted-foreground mt-1">
            Create inspiration boards from videos and images
          </p>
        </div>
        <a
          href="https://github.com/divital-coder/video-collage-cli"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View CLI on GitHub
          </Button>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Download Section */}
        <Card className="card-glow bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-400" />
              Download Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urls">Video URLs</Label>
              <Input
                id="urls"
                placeholder="Paste YouTube, Twitter, TikTok URLs..."
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                className="bg-secondary/30"
              />
              <p className="text-xs text-muted-foreground">
                Supports 1000+ sites via yt-dlp
              </p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={isLoading || !urls.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Download Videos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generate Section */}
        <Card className="card-glow bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-green-400" />
              Generate Collage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        <span className="flex items-center gap-2">
                          <l.icon className="h-4 w-4" />
                          {l.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quality Preset</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shader Effect</Label>
                <Select value={shader} onValueChange={setShader}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHADERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={10}
                  max={600}
                  className="bg-secondary/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gpu"
                checked={useGpu}
                onChange={(e) => setUseGpu(e.target.checked)}
                className="accent-blue-500"
              />
              <Label htmlFor="gpu" className="cursor-pointer">
                Use GPU acceleration (NVIDIA NVENC)
              </Label>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Collage
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Current Collage Preview */}
      <Card className="card-glow bg-card/50 backdrop-blur overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-400" />
            Current Collage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black">
            <video
              src="/inspiration-collage.mp4"
              className="w-full h-full object-contain"
              controls
              loop
              muted
            />
          </div>
        </CardContent>
      </Card>

      {/* CLI Output */}
      {output.length > 0 && (
        <Card className="card-glow bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Output Log</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setOutput([])}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-green-400 max-h-48 overflow-y-auto">
              {output.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLI Instructions */}
      <Card className="bg-secondary/20 border-dashed">
        <CardContent className="py-6">
          <h3 className="font-semibold mb-2">CLI Usage</h3>
          <p className="text-sm text-muted-foreground mb-4">
            For full control, use the video-collage CLI directly:
          </p>
          <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-foreground/80 space-y-2">
            <div className="text-muted-foreground"># Download videos</div>
            <div>video-collage download https://youtube.com/watch?v=...</div>
            <div className="text-muted-foreground mt-3"># Generate collage with GPU</div>
            <div>video-collage generate --gpu --layout treemap --shader vignette</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
