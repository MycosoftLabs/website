'use client'

import { useState } from 'react'
import { useHypotheses } from '@/hooks/scientific/use-hypotheses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, RefreshCw, AlertCircle, Plus, Beaker } from 'lucide-react'
import { toast } from 'sonner'

export function HypothesisBoard() {
  const { hypotheses, stats, isLive, isLoading, createHypothesis, testHypothesis, refresh } = useHypotheses()
  const [newStatement, setNewStatement] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const statusColors: Record<string, string> = {
    proposed: 'bg-gray-500',
    testing: 'bg-yellow-500',
    validated: 'bg-green-500',
    rejected: 'bg-red-500',
  }

  const [isCreating, setIsCreating] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newStatement.trim()) {
      toast.error('Please enter a hypothesis statement')
      return
    }
    setIsCreating(true)
    toast.loading('Creating hypothesis...', { id: 'create-hyp' })
    try {
      await createHypothesis(newStatement)
      toast.success('Hypothesis created!', { id: 'create-hyp' })
      setNewStatement('')
      setIsDialogOpen(false)
    } catch (err) {
      toast.error('Failed to create hypothesis', { id: 'create-hyp' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    toast.loading('Starting hypothesis test...', { id: `test-${id}` })
    try {
      await testHypothesis(id)
      toast.success('Hypothesis testing started!', { id: `test-${id}` })
    } catch (err) {
      toast.error('Failed to start test', { id: `test-${id}` })
    } finally {
      setTestingId(null)
    }
  }

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: 'Refreshing hypotheses...',
      success: 'Hypotheses updated!',
      error: 'Failed to refresh'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading hypotheses...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Hypothesis Board</CardTitle>
          {!isLive && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              <AlertCircle className="h-3 w-3 mr-1" /> Cached
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-green-500">{stats.validated} Validated</Badge>
            <Badge variant="outline" className="text-yellow-500">{stats.testing} Testing</Badge>
            <Badge variant="outline" className="text-gray-500">{stats.proposed} Proposed</Badge>
          </div>
          <Button size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Hypothesis</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Hypothesis</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Hypothesis Statement</label>
                  <Textarea 
                    value={newStatement} 
                    onChange={(e) => setNewStatement(e.target.value)}
                    placeholder="e.g., Electrical stimulation at 0.5Hz increases mycelium growth rate by 15-20%"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Hypothesis
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {hypotheses.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No hypotheses found</p>
        ) : (
          <div className="space-y-4">
            {hypotheses.map((hyp) => (
              <div key={hyp.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{hyp.statement}</p>
                    <p className="text-sm text-muted-foreground mt-1">ID: {hyp.id}</p>
                  </div>
                  <Badge className={statusColors[hyp.status] || 'bg-gray-500'}>{hyp.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {hyp.confidence !== undefined && hyp.confidence !== null && (
                      <span>Confidence: {(hyp.confidence * 100).toFixed(0)}%</span>
                    )}
                    {hyp.experiments && hyp.experiments.length > 0 && (
                      <span>Experiments: {hyp.experiments.join(', ')}</span>
                    )}
                  </div>
                  {hyp.status === 'proposed' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleTest(hyp.id)}
                      disabled={testingId === hyp.id}
                    >
                      {testingId === hyp.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Beaker className="h-4 w-4 mr-1" />}
                      Test
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
