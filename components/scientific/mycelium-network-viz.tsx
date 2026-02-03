'use client'

import { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MyceliumNetworkViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [nodeCount, setNodeCount] = useState(20)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Array<{ x: number; y: number; signal: number }>>([])
  const edgesRef = useRef<Array<{ source: number; target: number }>>([])

  useEffect(() => {
    initializeNetwork()
    return () => { 
      if (animationRef.current) cancelAnimationFrame(animationRef.current) 
    }
  }, [])

  useEffect(() => {
    if (isSimulating) {
      const animate = () => {
        updateNetwork()
        drawNetwork()
        animationRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      drawNetwork()
    }
  }, [isSimulating])

  const initializeNetwork = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    nodesRef.current = [{ x: centerX, y: centerY, signal: 1 }]
    edgesRef.current = []

    for (let i = 1; i <= 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 50 + Math.random() * 150
      nodesRef.current.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        signal: Math.random(),
      })
      const parent = Math.floor(Math.random() * i)
      edgesRef.current.push({ source: parent, target: i })
    }
    setNodeCount(nodesRef.current.length)
    drawNetwork()
  }

  const updateNetwork = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    if (Math.random() < 0.05 && nodesRef.current.length < 100) {
      const parentIdx = Math.floor(Math.random() * nodesRef.current.length)
      const parent = nodesRef.current[parentIdx]
      const angle = Math.random() * Math.PI * 2
      const distance = 20 + Math.random() * 30
      nodesRef.current.push({
        x: Math.max(20, Math.min(canvas.width - 20, parent.x + Math.cos(angle) * distance)),
        y: Math.max(20, Math.min(canvas.height - 20, parent.y + Math.sin(angle) * distance)),
        signal: Math.random() * 0.5,
      })
      edgesRef.current.push({ source: parentIdx, target: nodesRef.current.length - 1 })
      setNodeCount(nodesRef.current.length)
    }
    
    nodesRef.current.forEach((node) => {
      node.signal = Math.max(0, Math.min(1, node.signal + (Math.random() - 0.5) * 0.1))
    })
  }

  const drawNetwork = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    edgesRef.current.forEach((edge) => {
      const source = nodesRef.current[edge.source]
      const target = nodesRef.current[edge.target]
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
      }
    })

    nodesRef.current.forEach((node) => {
      const hue = 120 - node.signal * 120
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.beginPath()
      ctx.arc(node.x, node.y, 4 + node.signal * 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mycelium Network</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={initializeNetwork}>Reset</Button>
          <Button size="sm" onClick={() => setIsSimulating(!isSimulating)}>
            {isSimulating ? 'Pause' : 'Grow'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} width={500} height={300} className="w-full rounded border bg-black" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Nodes: {nodeCount}</span>
          <span>Edges: {edgesRef.current.length}</span>
          <span>{isSimulating ? 'ðŸŸ¢ Growing' : 'â¸ Paused'}</span>
        </div>
      </CardContent>
    </Card>
  )
}
