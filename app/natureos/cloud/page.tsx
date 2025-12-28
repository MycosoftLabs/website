"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Cloud, Link2, Unlink, Settings, Activity, Database, Server, Globe, Shield, Zap, ExternalLink } from "lucide-react"

interface CloudProvider {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  services: string[]
  usage?: { compute: number; storage: number; network: number }
}

const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: "aws",
    name: "Amazon Web Services",
    description: "Cloud computing, storage, and AI/ML services",
    icon: "🔶",
    connected: true,
    services: ["EC2", "S3", "Lambda", "SageMaker"],
    usage: { compute: 45, storage: 68, network: 32 }
  },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    description: "BigQuery, Cloud Run, and Vertex AI",
    icon: "🔷",
    connected: true,
    services: ["BigQuery", "Cloud Run", "Vertex AI", "Cloud Storage"],
    usage: { compute: 28, storage: 42, network: 15 }
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    description: "Azure Maps, Cognitive Services, and CosmosDB",
    icon: "🔵",
    connected: false,
    services: ["Azure Maps", "Cognitive Services", "CosmosDB", "Functions"]
  },
  {
    id: "palantir",
    name: "Palantir Foundry",
    description: "Advanced data analytics and AI platform",
    icon: "⬛",
    connected: false,
    services: ["Foundry", "Gotham", "Apollo", "AIP"]
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Cloud data warehouse and analytics",
    icon: "❄️",
    connected: false,
    services: ["Data Warehouse", "Data Lake", "Data Sharing"]
  },
  {
    id: "databricks",
    name: "Databricks",
    description: "Unified analytics and AI platform",
    icon: "🧱",
    connected: false,
    services: ["Delta Lake", "MLflow", "Spark", "SQL Analytics"]
  }
]

export default function CloudPage() {
  const [providers, setProviders] = useState(CLOUD_PROVIDERS)

  const toggleConnection = (id: string) => {
    setProviders(providers.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          connected: !p.connected,
          usage: !p.connected ? { compute: Math.random() * 50, storage: Math.random() * 70, network: Math.random() * 40 } : undefined
        }
      }
      return p
    }))
  }

  const connectedCount = providers.filter(p => p.connected).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cloud Integrations</h1>
          <p className="text-muted-foreground">Connect NatureOS to cloud providers and services</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Cloud className="h-4 w-4 mr-2" /> {connectedCount} Connected
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Connections</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{connectedCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Server className="h-4 w-4" /> Compute Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <Progress value={73} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Database className="h-4 w-4" /> Storage</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 TB</div>
            <Progress value={55} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Zap className="h-4 w-4" /> API Calls (24h)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1.2M</div></CardContent>
        </Card>
      </div>

      {/* Provider Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <Card key={provider.id} className={provider.connected ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{provider.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                </div>
                <Switch checked={provider.connected} onCheckedChange={() => toggleConnection(provider.id)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Services</p>
                <div className="flex flex-wrap gap-1">
                  {provider.services.map(service => (
                    <Badge key={service} variant="secondary" className="text-xs">{service}</Badge>
                  ))}
                </div>
              </div>

              {provider.connected && provider.usage && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compute</span>
                    <span>{provider.usage.compute.toFixed(0)}%</span>
                  </div>
                  <Progress value={provider.usage.compute} className="h-1" />
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Storage</span>
                    <span>{provider.usage.storage.toFixed(0)}%</span>
                  </div>
                  <Progress value={provider.usage.storage} className="h-1" />
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span>{provider.usage.network.toFixed(0)}%</span>
                  </div>
                  <Progress value={provider.usage.network} className="h-1" />
                </div>
              )}

              <div className="flex gap-2">
                {provider.connected ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-1" /> Configure
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Activity className="h-4 w-4 mr-1" /> Dashboard
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => toggleConnection(provider.id)}>
                    <Link2 className="h-4 w-4 mr-2" /> Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Notice */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-green-500" />
            <div>
              <h3 className="font-medium">Secure Connections</h3>
              <p className="text-sm text-muted-foreground">
                All cloud integrations use OAuth 2.0 and encrypted connections. API keys are stored securely and never exposed in client-side code.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
