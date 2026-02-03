'use client'

import { useState, useEffect } from 'react'
import { useFCI } from '@/hooks/scientific'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'

interface ElectrodeMapProps {
  sessionId?: string
  rows?: number
  cols?: number
}

export function ElectrodeMap({ sessionId, rows = 8, cols = 8 }: ElectrodeMapProps) {
  const { electrodeStatus, isLoading, refresh } = useFCI()
  const [selectedElectrodes, setSelectedElectrodes] = useState<Set<number>>(new Set())
  const total = rows * cols

  const toggleElectrode = (index: number) => {
    const newSelected = new Set(selectedElectrodes)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedElectrodes(newSelected)
  }

  const getElectrodeColor = (index: number) => {
    if (selectedElectrodes.has(index)) return 'bg-blue-500 ring-2 ring-blue-300'
    
    const electrode = electrodeStatus[index]
    if (!electrode || !electrode.active) return 'bg-gray-300 dark:bg-gray-700'
    
    // Color based on signal intensity
    const signal = electrode.signal
    if (signal > 70) return 'bg-red-500'
    if (signal > 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getElectrodeTooltip = (index: number) => {
    const electrode = electrodeStatus[index]
    if (!electrode) return `Electrode ${index + 1}`
    return `E${index + 1}: ${electrode.active ? 'Active' : 'Inactive'}\nImpedance: ${electrode.impedance?.toFixed(0) || '?'} kÎ©\nSignal: ${electrode.signal?.toFixed(1) || '?'}%`
  }

  const activeCount = electrodeStatus.filter(e => e?.active).length

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading electrode data...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Electrode Array ({rows}x{cols})</CardTitle>
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">{activeCount}/{total} active</span>
          <Button size="sm" variant="ghost" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1 mx-auto max-w-md" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              className={`aspect-square rounded-full transition-all hover:scale-110 ${getElectrodeColor(i)}`}
              onClick={() => toggleElectrode(i)}
              title={getElectrodeTooltip(i)}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-4">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Low Signal</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> High Signal</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300"></span> Inactive</span>
        </div>
        {selectedElectrodes.size > 0 && (
          <div className="mt-4 p-2 border rounded text-sm">
            <p className="font-medium">Selected Electrodes:</p>
            <p className="text-muted-foreground">{Array.from(selectedElectrodes).map(i => `E${i + 1}`).join(', ')}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setSelectedElectrodes(new Set())}>
              Clear Selection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
