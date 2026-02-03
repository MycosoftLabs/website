'use client'

import { useState } from 'react'
import { useLabInstruments } from '@/hooks/scientific'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function LabMonitor() {
  const { instruments, isLive, isLoading, error, calibrate, refresh } = useLabInstruments()
  const [calibratingId, setCalibratingId] = useState<string | null>(null)

  const handleCalibrate = async (id: string, name: string) => {
    setCalibratingId(id)
    toast.loading(`Calibrating ${name}...`, { id: `calibrate-${id}` })
    try {
      await calibrate(id)
      toast.success(`${name} calibration started!`, { id: `calibrate-${id}` })
    } catch (err) {
      toast.error(`Failed to calibrate ${name}`, { id: `calibrate-${id}` })
    } finally {
      setCalibratingId(null)
    }
  }

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: 'Refreshing instruments...',
      success: 'Instruments updated!',
      error: 'Failed to refresh'
    })
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-blue-500',
    maintenance: 'bg-yellow-500',
  }

  const typeIcons: Record<string, string> = {
    incubator: 'ðŸŒ¡ï¸',
    pipettor: 'ðŸ’‰',
    bioreactor: 'ðŸ§ª',
    microscope: 'ðŸ”¬',
    sequencer: 'ðŸ§¬',
    centrifuge: 'ðŸ”„',
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading instruments...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Laboratory Instruments</CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
        </div>
<Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-500 mb-4">
            Failed to load live data. Showing cached results.
          </div>
        )}
        {instruments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No instruments found</p>
        ) : (
          <div className="space-y-3">
            {instruments.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeIcons[inst.type] || 'ðŸ“Ÿ'}</span>
                  <div>
                    <p className="font-medium">{inst.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{inst.type}</p>
                    {inst.currentTask && (
                      <p className="text-xs text-blue-500">{inst.currentTask}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[inst.status]}>{inst.status}</Badge>
                  {inst.status === 'online' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleCalibrate(inst.id, inst.name)}
                      disabled={calibratingId === inst.id}
                    >
                      {calibratingId === inst.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Calibrate'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
