'use client'

import { useState } from 'react'
import { useSimulations } from '@/hooks/scientific'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Play, Pause, X, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function SimulationPanel() {
  const { simulations, gpuUtilization, queueLength, isLive, isLoading, startSimulation, controlSimulation, refresh } = useSimulations()
  const [newSimName, setNewSimName] = useState('')
  const [newSimType, setNewSimType] = useState('alphafold')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const statusColors = {
    queued: 'bg-gray-500',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
  }

  const typeIcons: Record<string, string> = {
    alphafold: 'ðŸ§¬',
    boltzgen: 'âš¡',
    mycelium: 'ðŸ„',
    cobrapy: 'ðŸ”„',
    physics: 'âš›ï¸',
    molecular: 'ðŸ”¬',
  }

  const [isCreating, setIsCreating] = useState(false)
  const [controllingId, setControllingId] = useState<string | null>(null)

  const handleStartSimulation = async () => {
    if (!newSimName) {
      toast.error('Please enter a simulation name')
      return
    }
    setIsCreating(true)
    toast.loading('Creating simulation...', { id: 'create-sim' })
    try {
      await startSimulation({
        type: newSimType,
        name: newSimName,
        config: {},
      })
      toast.success(`Simulation "${newSimName}" queued!`, { id: 'create-sim' })
      setNewSimName('')
      setIsDialogOpen(false)
    } catch (err) {
      toast.error('Failed to create simulation', { id: 'create-sim' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleControl = async (id: string, action: 'pause' | 'resume' | 'cancel', name: string) => {
    setControllingId(id)
    const actionText = action === 'pause' ? 'Pausing' : action === 'resume' ? 'Resuming' : 'Cancelling'
    toast.loading(`${actionText} ${name}...`, { id: `control-${id}` })
    try {
      await controlSimulation(id, action)
      toast.success(`${name} ${action}ed!`, { id: `control-${id}` })
    } catch (err) {
      toast.error(`Failed to ${action} ${name}`, { id: `control-${id}` })
    } finally {
      setControllingId(null)
    }
  }

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: 'Refreshing simulations...',
      success: 'Simulations updated!',
      error: 'Failed to refresh'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading simulations...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Simulations</CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
          <Badge variant="outline">GPU: {gpuUtilization}%</Badge>
          <Badge variant="outline">Queue: {queueLength}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">New Simulation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Simulation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Simulation Name</label>
                  <Input 
                    value={newSimName} 
                    onChange={(e) => setNewSimName(e.target.value)}
                    placeholder="e.g., Protein Structure Analysis"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newSimType} onValueChange={setNewSimType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alphafold">AlphaFold - Protein Structure</SelectItem>
                      <SelectItem value="boltzgen">BoltzGen - Protein Design</SelectItem>
                      <SelectItem value="mycelium">Mycelium Network</SelectItem>
                      <SelectItem value="cobrapy">COBRApy - Metabolic Pathway</SelectItem>
                      <SelectItem value="physics">Physics Simulation</SelectItem>
                      <SelectItem value="molecular">Molecular Dynamics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleStartSimulation} className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Start Simulation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {simulations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No simulations running</p>
        ) : (
          <div className="space-y-4">
            {simulations.map((sim) => (
              <div key={sim.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeIcons[sim.type] || 'ðŸ“Š'}</span>
                    <div>
                      <p className="font-medium">{sim.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{sim.type}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[sim.status]}>{sim.status}</Badge>
                </div>
                {(sim.status === 'running' || sim.status === 'paused') && (
                  <>
                    <Progress value={sim.progress} className="h-2 mb-1" />
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{sim.progress}%</span>
                      {sim.eta && <span>ETA: {sim.eta}</span>}
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  {sim.status === 'running' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleControl(sim.id, 'pause', sim.name)}
                      disabled={controllingId === sim.id}
                    >
                      {controllingId === sim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  )}
                  {sim.status === 'paused' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleControl(sim.id, 'resume', sim.name)}
                      disabled={controllingId === sim.id}
                    >
                      {controllingId === sim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                  )}
                  {sim.status !== 'completed' && sim.status !== 'failed' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleControl(sim.id, 'cancel', sim.name)}
                      disabled={controllingId === sim.id}
                    >
                      {controllingId === sim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
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
