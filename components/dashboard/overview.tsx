"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CircularProgress } from "@/components/dashboard/circular-progress"
import { LineChart, Network, Activity, Zap, Globe, Bot, Code, Database, Cloud, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Overview() {
  return (
    <div className="grid gap-4">
      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
            <Network className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,345</div>
            <p className="text-xs text-muted-foreground">+180 from last hour</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <Code className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2M</div>
            <p className="text-xs text-muted-foreground">23k requests/min</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Operations</CardTitle>
            <Bot className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">845k</div>
            <p className="text-xs text-muted-foreground">98.2% success rate</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.8TB</div>
            <p className="text-xs text-muted-foreground">of 2.5TB total</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-7">
        {/* Network Visualization */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Network Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative rounded-lg overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-1.jpg-znURduYEsPZvvAGrR0sLNdYcC9r97W.jpeg"
                alt="Network Visualization"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <CircularProgress value={78} icon={LineChart} label="Growth Rate" />
              <CircularProgress value={92} icon={Network} label="Network Health" />
              <CircularProgress value={64} icon={Activity} label="Active Nodes" />
              <CircularProgress value={45} icon={Zap} label="Energy Usage" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Bot, text: "AI Model training completed", time: "2m ago", status: "success" },
                { icon: AlertCircle, text: "High network load detected", time: "5m ago", status: "warning" },
                { icon: Cloud, text: "New node cluster deployed", time: "15m ago", status: "success" },
                { icon: Database, text: "Database backup completed", time: "1h ago", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${item.status === "success" ? "bg-green-500/20" : "bg-yellow-500/20"}`}
                  >
                    <item.icon
                      className={`h-4 w-4 ${item.status === "success" ? "text-green-500" : "text-yellow-500"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button className="w-full justify-start" variant="outline">
                <Bot className="mr-2 h-4 w-4" />
                Launch AI Studio
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Globe className="mr-2 h-4 w-4" />
                View Global Network
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Code className="mr-2 h-4 w-4" />
                API Documentation
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Cloud className="mr-2 h-4 w-4" />
                Deploy New Node
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
