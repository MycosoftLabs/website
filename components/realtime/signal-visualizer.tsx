'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSignalStream } from '@/hooks/realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Pause, RefreshCw, Maximize2 } from 'lucide-react'

interface SignalVisualizerProps {
  sessionId?: string
  channels?: number
  height?: number
}

export function SignalVisualizer({ sessionId, channels = 8, height = 400 }: SignalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const { signals, signalHistory, isConnected } = useSignalStream(sessionId)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrum'>('waveform')
  const bufferRef = useRef<number[][]>(Array(channels).fill([]).map(() => []))

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let i = 0; i < 10; i++) {
      const y = (height / 10) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw channels
    const channelHeight = height / channels
    const colors = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

    bufferRef.current.forEach((data, i) => {
      if (selectedChannel !== 'all' && parseInt(selectedChannel) !== i) return

      const color = colors[i % colors.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()

      const yOffset = selectedChannel === 'all' ? channelHeight * i + channelHeight / 2 : height / 2

      data.forEach((value, j) => {
        const x = (j / data.length) * width
        const amplitude = selectedChannel === 'all' ? channelHeight / 3 : height / 3
        const y = yOffset + (value / 100) * amplitude

        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })

      ctx.stroke()

      // Draw channel label
      if (selectedChannel === 'all') {
        ctx.fillStyle = color
        ctx.font = '10px monospace'
        ctx.fillText(`CH${i + 1}`, 5, channelHeight * i + 15)
      }
    })

    // Draw time indicator
    ctx.fillStyle = '#666'
    ctx.font = '10px monospace'
    ctx.fillText(`${new Date().toLocaleTimeString()}`, width - 70, height - 10)

    if (!isPaused) {
      animationRef.current = requestAnimationFrame(drawWaveform)
    }
  }, [channels, selectedChannel, isPaused])

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    // Simulated FFT display
    const bars = 64
    const barWidth = width / bars - 2

    for (let i = 0; i < bars; i++) {
      const value = Math.random() * 0.5 + (Math.sin(i / 10) * 0.3 + 0.3)
      const barHeight = value * height * 0.8

      const hue = (i / bars) * 120
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight)
    }

    ctx.fillStyle = '#666'
    ctx.font = '10px monospace'
    ctx.fillText('Frequency (Hz)', width / 2 - 40, height - 5)
    ctx.fillText('0', 5, height - 5)
    ctx.fillText('500', width - 30, height - 5)

    if (!isPaused) {
      animationRef.current = requestAnimationFrame(drawSpectrum)
    }
  }, [isPaused])

  useEffect(() => {
    // Update buffer with new signal data
    if (signals && !isPaused) {
      signals.channels.forEach((channelData, i) => {
        if (i < channels) {
          bufferRef.current[i] = [...bufferRef.current[i].slice(-499), ...channelData].slice(-500)
        }
      })
    }
  }, [signals, channels, isPaused])

  useEffect(() => {
    // Generate simulated data if no real data
    if (!signals && !isPaused) {
      const interval = setInterval(() => {
        bufferRef.current = bufferRef.current.map((_, i) => {
          const newData = Array(10).fill(0).map(() => 
            Math.sin(Date.now() / 100 + i) * 50 + Math.random() * 20 - 10
          )
          return [...bufferRef.current[i].slice(-490), ...newData]
        })
      }, 16)
      return () => clearInterval(interval)
    }
  }, [signals, isPaused])

  useEffect(() => {
    const draw = viewMode === 'waveform' ? drawWaveform : drawSpectrum
    draw()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [viewMode, drawWaveform, drawSpectrum])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Signal Visualizer</CardTitle>
          <Badge variant={isConnected ? 'default' : 'outline'} className={isConnected ? 'bg-green-500' : ''}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'waveform' | 'spectrum')}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="waveform">Waveform</SelectItem>
              <SelectItem value="spectrum">Spectrum</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Array.from({ length: channels }).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>CH{i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className="w-full rounded-b-lg"
          style={{ height: `${height}px` }}
        />
      </CardContent>
    </Card>
  )
}
