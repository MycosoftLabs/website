import type { Metadata } from 'next'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Cpu, Shield, Zap } from "lucide-react"

export const metadata: Metadata = {
  title: 'Documentation | Mycosoft',
  description: 'Mycosoft developer documentation, API references, and integration guides.',
  alternates: {
    canonical: '/docs',
  },
  openGraph: {
    title: 'Documentation | Mycosoft',
    description: 'Mycosoft developer documentation, API references, and integration guides.',
    url: '/docs',
  },
}

export default function DocsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Developer Documentation</h1>
      <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
        API and platform documentation for MYCA, AVANI, NLM, and Mycosoft services. Request access for API keys and full docs.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <FileText className="h-6 w-6 text-primary mb-2" />
            <CardTitle>AI Platform</CardTitle>
            <CardDescription>MYCA, AVANI, NLM APIs and integration guides</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai">
              <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                AI Overview
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Cpu className="h-6 w-6 text-primary mb-2" />
            <CardTitle>NatureOS & MINDEX</CardTitle>
            <CardDescription>Dashboards, data APIs, and search</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/natureos">
              <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                NatureOS
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Shield className="h-6 w-6 text-primary mb-2" />
            <CardTitle>APIs & Integrations</CardTitle>
            <CardDescription>API keys, usage, and onboarding</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Request API access and developer onboarding. Human seats, agent seats, and infrastructure tiers.
            </p>
            <Link href="/contact">
              <Button className="w-full sm:w-auto min-h-[44px]">
                Request access
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Zap className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Resources</CardTitle>
            <CardDescription>Apps, devices, and platform tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/apps">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  Apps
                </Button>
              </Link>
              <Link href="/devices">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  Devices
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
