"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, Settings, ExternalLink, Check, X, RefreshCw,
  Zap, Cloud, Bot, Music, Database, Globe, Code, Webhook
} from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  category: "automation" | "ai" | "data" | "communication" | "storage"
  status: "connected" | "disconnected" | "error"
  enabled: boolean
  icon: React.ReactNode
  configUrl?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: "n8n-local",
      name: "n8n (Local)",
      description: "Local workflow automation on localhost:5678",
      category: "automation",
      status: "connected",
      enabled: true,
      icon: <Webhook className="h-5 w-5 text-orange-500" />,
      configUrl: "http://localhost:5678",
    },
    {
      id: "n8n-cloud",
      name: "n8n Cloud",
      description: "Cloud workflow automation at mycosoft.app.n8n.cloud",
      category: "automation",
      status: "connected",
      enabled: true,
      icon: <Cloud className="h-5 w-5 text-blue-500" />,
      configUrl: "https://mycosoft.app.n8n.cloud",
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      description: "AI voice synthesis and text-to-speech",
      category: "ai",
      status: "connected",
      enabled: true,
      icon: <Music className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT models for AI completion and embeddings",
      category: "ai",
      status: "connected",
      enabled: true,
      icon: <Bot className="h-5 w-5 text-green-500" />,
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      description: "Claude AI models for analysis and reasoning",
      category: "ai",
      status: "disconnected",
      enabled: false,
      icon: <Bot className="h-5 w-5 text-orange-500" />,
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Connect to 5000+ apps with Zaps",
      category: "automation",
      status: "disconnected",
      enabled: false,
      icon: <Zap className="h-5 w-5 text-orange-500" />,
    },
    {
      id: "ifttt",
      name: "IFTTT",
      description: "If This Then That automation",
      category: "automation",
      status: "disconnected",
      enabled: false,
      icon: <Code className="h-5 w-5 text-blue-400" />,
    },
    {
      id: "google",
      name: "Google APIs",
      description: "Google Maps, Calendar, Drive integration",
      category: "data",
      status: "connected",
      enabled: true,
      icon: <Globe className="h-5 w-5 text-red-500" />,
    },
    {
      id: "azure",
      name: "Microsoft Azure",
      description: "Azure Maps, Cosmos DB, Blob Storage",
      category: "storage",
      status: "connected",
      enabled: true,
      icon: <Cloud className="h-5 w-5 text-blue-600" />,
    },
    {
      id: "inaturalist",
      name: "iNaturalist",
      description: "Biodiversity observation data",
      category: "data",
      status: "connected",
      enabled: true,
      icon: <Database className="h-5 w-5 text-green-600" />,
    },
    {
      id: "gbif",
      name: "GBIF",
      description: "Global Biodiversity Information Facility",
      category: "data",
      status: "connected",
      enabled: true,
      icon: <Globe className="h-5 w-5 text-teal-500" />,
    },
    {
      id: "mycobank",
      name: "MycoBank",
      description: "Fungal nomenclature database",
      category: "data",
      status: "connected",
      enabled: true,
      icon: <Database className="h-5 w-5 text-amber-600" />,
    },
  ])

  const categories = [...new Set(integrations.map((i) => i.category))]

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, enabled: !i.enabled, status: !i.enabled ? "connected" : "disconnected" } : i
      )
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "automation":
        return <Zap className="h-4 w-4" />
      case "ai":
        return <Bot className="h-4 w-4" />
      case "data":
        return <Database className="h-4 w-4" />
      case "communication":
        return <Globe className="h-4 w-4" />
      case "storage":
        return <Cloud className="h-4 w-4" />
      default:
        return <Code className="h-4 w-4" />
    }
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length

  return (
    <DashboardShell>
      <DashboardHeader heading="Integration Hub" text="Manage all MYCOSOFT integrations" />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <Badge variant="outline" className="text-green-500 border-green-500">
              <Check className="h-3 w-3 mr-1" />
              {connectedCount} Connected
            </Badge>
            <Badge variant="outline" className="text-gray-500">
              {integrations.length - connectedCount} Disconnected
            </Badge>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({integrations.length})</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize flex items-center gap-1">
                {getCategoryIcon(category)}
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <IntegrationGrid 
              integrations={integrations} 
              toggleIntegration={toggleIntegration}
            />
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-4">
              <IntegrationGrid 
                integrations={integrations.filter((i) => i.category === category)} 
                toggleIntegration={toggleIntegration}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardShell>
  )
}

function IntegrationGrid({ 
  integrations, 
  toggleIntegration 
}: { 
  integrations: Integration[]
  toggleIntegration: (id: string) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {integrations.map((integration) => (
        <Card key={integration.id} className={integration.enabled ? "" : "opacity-60"}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">{integration.icon}</div>
                <div>
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <Badge
                    variant={integration.status === "connected" ? "default" : integration.status === "error" ? "destructive" : "secondary"}
                    className="mt-1"
                  >
                    {integration.status === "connected" && <Check className="h-3 w-3 mr-1" />}
                    {integration.status === "error" && <X className="h-3 w-3 mr-1" />}
                    {integration.status}
                  </Badge>
                </div>
              </div>
              <Switch
                checked={integration.enabled}
                onCheckedChange={() => toggleIntegration(integration.id)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">{integration.description}</CardDescription>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
              {integration.configUrl && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={integration.configUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
