'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, Users, Cpu, HardDrive, Zap } from 'lucide-react'
import { useState } from 'react'

const metrics = [
  { label: 'Active Users', value: '8', change: '+2', icon: Users, color: 'text-blue-500' },
  { label: 'Experiments Run', value: '142', change: '+23', icon: Zap, color: 'text-amber-500' },
  { label: 'Compute Hours', value: '384h', change: '+56h', icon: Cpu, color: 'text-purple-500' },
  { label: 'Storage Used', value: '12.4 GB', change: '+1.2 GB', icon: HardDrive, color: 'text-green-500' },
]

const usageBreakdown = [
  { label: 'Simulations', used: 78, limit: 100 },
  { label: 'Experiments', used: 142, limit: 200 },
  { label: 'API Calls', used: 12847, limit: 50000 },
  { label: 'Storage (GB)', used: 12.4, limit: 50 },
  { label: 'Compute Hours', used: 384, limit: 500 },
]

export default function PlatformAnalyticsPage() {
  const [period, setPeriod] = useState('30d')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Usage metrics and resource consumption</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold">{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color}`} />
              </div>
              <div className="mt-2">
                <Badge variant="outline" className="text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {m.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resource Usage
          </CardTitle>
          <CardDescription>Current usage against organization quotas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usageBreakdown.map((item) => {
            const percent = Math.round((item.used / item.limit) * 100)
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.used.toLocaleString()} / {item.limit.toLocaleString()} ({percent}%)
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
