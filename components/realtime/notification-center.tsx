'use client'

import { useState } from 'react'
import { useSafetyAlerts, useSimulationProgress, useExperimentSteps } from '@/hooks/realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, X, Check, AlertTriangle, Info, CheckCircle, FlaskConical, Cpu } from 'lucide-react'

interface Notification {
  id: string
  type: 'safety' | 'simulation' | 'experiment' | 'system'
  severity: 'info' | 'success' | 'warning' | 'critical'
  title: string
  message: string
  timestamp: number
  read: boolean
}

export function NotificationCenter() {
  const { alerts } = useSafetyAlerts()
  const { progress: simProgress } = useSimulationProgress()
  const { step: expStep } = useExperimentSteps()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Convert alerts to notifications
  const allNotifications: Notification[] = [
    ...alerts.map((a, i) => ({
      id: `alert-${i}`,
      type: 'safety' as const,
      severity: a.severity,
      title: 'Safety Alert',
      message: a.message,
      timestamp: a.timestamp,
      read: false,
    })),
    ...(simProgress ? [{
      id: `sim-${simProgress.id}`,
      type: 'simulation' as const,
      severity: 'info' as const,
      title: 'Simulation Update',
      message: `${simProgress.id}: ${simProgress.progress}% complete`,
      timestamp: Date.now(),
      read: false,
    }] : []),
    ...(expStep ? [{
      id: `exp-${expStep.id}`,
      type: 'experiment' as const,
      severity: 'info' as const,
      title: 'Experiment Update',
      message: `Step ${expStep.step}/${expStep.totalSteps}: ${expStep.message || expStep.status}`,
      timestamp: Date.now(),
      read: false,
    }] : []),
    ...notifications,
  ].sort((a, b) => b.timestamp - a.timestamp)

  const unreadCount = allNotifications.filter(n => !n.read).length

  const getIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (severity === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (type === 'simulation') return <Cpu className="h-4 w-4 text-blue-500" />
    if (type === 'experiment') return <FlaskConical className="h-4 w-4 text-purple-500" />
    return <Info className="h-4 w-4 text-gray-500" />
  }

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-lg">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Notifications</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={markAllRead}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {allNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="divide-y">
                  {allNotifications.slice(0, 20).map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-3 hover:bg-accent/50 ${!notif.read ? 'bg-accent/20' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {getIcon(notif.type, notif.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{notif.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">{notif.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{notif.message}</p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
