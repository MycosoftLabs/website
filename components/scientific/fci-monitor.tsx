'use client'

import { useState } from 'react'
import { useFCI } from '@/hooks/scientific'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Play, Pause, Square, Zap, RefreshCw, AlertCircle, Plus } from 'lucide-react'

export function FCIMonitor() {
  const { sessions, signalQuality, isLive, isLoading, startSession, controlSession, refresh } = useFCI()
  const [newSpecies, setNewSpecies] = useState('')
  const [newStrain, setNewStrain] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const statusColors = {
    recording: 'bg-red-500 animate-pulse',
    stimulating: 'bg-yellow-500 animate-pulse',
    idle: 'bg-gray-500',
    paused: 'bg-blue-500',
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const handleStartSession = async () => {
    if (!newSpecies) return
    await startSession(newSpecies, newStrain || undefined)
    setNewSpecies('')
    setNewStrain('')
    setIsDialogOpen(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading FCI sessions...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>FCI Sessions</CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
          <Badge variant="outline">Signal: {signalQuality}%</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start FCI Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Species</label>
                  <Input 
                    value={newSpecies} 
                    onChange={(e) => setNewSpecies(e.target.value)}
                    placeholder="e.g., Pleurotus ostreatus"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Strain (Optional)</label>
                  <Input 
                    value={newStrain} 
                    onChange={(e) => setNewStrain(e.target.value)}
                    placeholder="e.g., PO-001"
                  />
                </div>
                <Button onClick={handleStartSession} className="w-full">Start Session</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No active FCI sessions</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{session.species}</p>
                    {session.strain && <p className="text-sm text-muted-foreground">{session.strain}</p>}
                  </div>
                  <Badge className={statusColors[session.status]}>{session.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Duration: {formatDuration(session.duration)}</span>
                  <span>Electrodes: {session.electrodesActive}/{session.totalElectrodes}</span>
                  <span>{session.sampleRate} Hz</span>
                </div>
                <div className="flex gap-2">
                  {(session.status === 'recording' || session.status === 'stimulating') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => controlSession(session.id, 'pause')}>
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => controlSession(session.id, 'stop')}>
                        <Square className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {session.status === 'paused' && (
                    <Button size="sm" variant="outline" onClick={() => controlSession(session.id, 'start')}>
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {session.status !== 'stimulating' && (
                    <Button size="sm" variant="outline" onClick={() => controlSession(session.id, 'stimulate')}>
                      <Zap className="h-4 w-4 mr-1" /> Stimulate
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
