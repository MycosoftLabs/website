'use client'

import { useSafety } from '@/hooks/scientific/use-safety'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw, AlertCircle, Shield } from 'lucide-react'

export function SafetyMonitor() {
  const { overallStatus, metrics, isLive, isLoading, refresh } = useSafety()

  const statusColors: Record<string, string> = {
    ok: 'bg-green-500',
    nominal: 'bg-green-500',
    normal: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-500',
  }

  const getProgressColor = (status: string) => {
    if (status === 'normal' || status === 'ok') return 'bg-green-500'
    if (status === 'warning') return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading safety metrics...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Safety Monitor
          </CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[overallStatus] || 'bg-gray-500'}>
            {overallStatus === 'nominal' || overallStatus === 'ok' ? 'All Safe' : 
             overallStatus === 'warning' ? 'Warnings' : 
             overallStatus === 'critical' ? 'Critical' : 'Unknown'}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No safety metrics available</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{metric.name}</span>
                  <span className="font-bold">{metric.value} / {metric.max}</span>
                </div>
                <Progress 
                  value={(metric.value / metric.max) * 100} 
                  className={`h-2 ${getProgressColor(metric.status)}`} 
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
