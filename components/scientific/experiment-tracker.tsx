'use client'

import { useState } from 'react'
import { useExperiments } from '@/hooks/scientific'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Pause, X, RefreshCw, AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function ExperimentTracker() {
  const { experiments, stats, isLive, isLoading, createExperiment, controlExperiment, refresh } = useExperiments()
  const [newExpName, setNewExpName] = useState('')
  const [newExpDesc, setNewExpDesc] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const statusColors = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const [isCreating, setIsCreating] = useState(false)
  const [controllingId, setControllingId] = useState<string | null>(null)

  const handleCreateExperiment = async () => {
    if (!newExpName) {
      toast.error('Please enter an experiment name')
      return
    }
    setIsCreating(true)
    toast.loading('Creating experiment...', { id: 'create-exp' })
    try {
      await createExperiment(newExpName, { description: newExpDesc })
      toast.success(`Experiment "${newExpName}" created!`, { id: 'create-exp' })
      setNewExpName('')
      setNewExpDesc('')
      setIsDialogOpen(false)
    } catch (err) {
      toast.error('Failed to create experiment', { id: 'create-exp' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleControl = async (id: string, action: 'start' | 'pause' | 'cancel', name: string) => {
    setControllingId(id)
    const actionText = action === 'start' ? 'Starting' : action === 'pause' ? 'Pausing' : 'Cancelling'
    toast.loading(`${actionText} experiment...`, { id: `control-${id}` })
    try {
      await controlExperiment(id, action)
      toast.success(`Experiment ${action}ed!`, { id: `control-${id}` })
    } catch (err) {
      toast.error(`Failed to ${action} experiment`, { id: `control-${id}` })
    } finally {
      setControllingId(null)
    }
  }

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: 'Refreshing experiments...',
      success: 'Experiments updated!',
      error: 'Failed to refresh'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading experiments...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Experiment Tracker</CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-blue-500">{stats.running} Running</Badge>
            <Badge variant="outline" className="text-gray-500">{stats.pending} Pending</Badge>
            <Badge variant="outline" className="text-green-500">{stats.completed} Done</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Experiment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Experiment Name</label>
                  <Input 
                    value={newExpName} 
                    onChange={(e) => setNewExpName(e.target.value)}
                    placeholder="e.g., Bioelectric Mapping - P. ostreatus"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    value={newExpDesc} 
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    placeholder="Describe the experiment objectives..."
                  />
                </div>
                <Button onClick={handleCreateExperiment} className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Experiment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {experiments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No experiments found</p>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => (
              <div key={exp.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{exp.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {exp.id}</p>
                  </div>
                  <Badge className={statusColors[exp.status]}>{exp.status}</Badge>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Step {exp.currentStep} of {exp.totalSteps}</span>
                    {exp.startedAt && <span className="text-muted-foreground">Started {formatDate(exp.startedAt)}</span>}
                  </div>
                  <Progress value={(exp.currentStep / exp.totalSteps) * 100} className="h-2" />
                </div>
                <div className="flex gap-2">
                  {exp.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleControl(exp.id, 'start', exp.name)}
                      disabled={controllingId === exp.id}
                    >
                      {controllingId === exp.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      Start
                    </Button>
                  )}
                  {exp.status === 'running' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleControl(exp.id, 'pause', exp.name)}
                        disabled={controllingId === exp.id}
                      >
                        {controllingId === exp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleControl(exp.id, 'cancel', exp.name)}
                        disabled={controllingId === exp.id}
                      >
                        {controllingId === exp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </Button>
                    </>
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
