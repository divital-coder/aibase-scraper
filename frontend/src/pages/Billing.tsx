import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, ExternalLink, Shield, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BillingPlatform {
  name: string
  description: string
  icon: React.ElementType
  url: string
  status: 'active' | 'inactive'
  iconColor: string
}

const billingPlatforms: BillingPlatform[] = [
  {
    name: 'Oracle Cloud Infrastructure',
    description: 'Cloud infrastructure services and database hosting. Credit card billing is managed through the Oracle Cloud console.',
    icon: Cloud,
    url: 'https://cloud.oracle.com',
    status: 'active',
    iconColor: 'text-red-500',
  },
  {
    name: 'Anthropic',
    description: 'API access and Claude AI services. Credit card billing is configured in the Anthropic console for API usage.',
    icon: Shield,
    url: 'https://console.anthropic.com',
    status: 'active',
    iconColor: 'text-orange-500',
  },
]

function PlatformCard({ platform }: { platform: BillingPlatform }) {
  const Icon = platform.icon

  return (
    <Card className="card-glow transition-all duration-300 hover:scale-[1.02] bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 p-3`}>
              <Icon className={`h-6 w-6 ${platform.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{platform.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    platform.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {platform.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed">
          {platform.description}
        </CardDescription>
        <Button
          variant="outline"
          size="sm"
          className="w-full group"
          onClick={() => window.open(platform.url, '_blank')}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Manage Billing
          <ExternalLink className="h-3 w-3 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </CardContent>
    </Card>
  )
}

export default function Billing() {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight gradient-text">
          Billing & Payments
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your credit card billing for cloud services and API access
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2 mt-1">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-blue-200">Secure Payment Processing</p>
              <p className="text-sm text-blue-300/80">
                Your credit card information is securely stored and managed by each platform's
                billing system. This application does not store or process payment information
                directly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Platforms Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-muted-foreground" />
          Active Billing Platforms
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {billingPlatforms.map((platform) => (
            <PlatformCard key={platform.name} platform={platform} />
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <Card className="bg-card/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5" />
              <p>
                <strong className="text-foreground">Oracle Cloud Infrastructure:</strong> Handles
                database hosting, compute resources, and storage services
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5" />
              <p>
                <strong className="text-foreground">Anthropic:</strong> Manages API access for
                Claude AI services and model usage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
