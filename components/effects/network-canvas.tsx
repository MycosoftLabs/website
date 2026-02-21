"use client"

import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"

interface NetworkCanvasProps {
  className?: string
  numNodes?: number
  addEdge?: number
  speed?: number
  force?: number
}

interface Node {
  px: number
  py: number
  rad: number
  vx: number
  vy: number
  opac: number
}

interface Edge {
  a: Node
  b: Node
  opac: number
}

class DisjointSet {
  private parents: number[]
  private ranks: number[]

  constructor(size: number) {
    this.parents = []
    this.ranks = []
    for (let i = 0; i < size; i++) {
      this.parents.push(i)
      this.ranks.push(0)
    }
  }

  private find(i: number): number {
    if (this.parents[i] !== i) {
      this.parents[i] = this.find(this.parents[i])
    }
    return this.parents[i]
  }

  connect(i: number, j: number): boolean {
    const rootA = this.find(i)
    const rootB = this.find(j)
    if (rootA === rootB) return false

    const rankDiff = this.ranks[rootA] - this.ranks[rootB]
    if (rankDiff >= 0) {
      if (rankDiff === 0) this.ranks[rootA]++
      this.parents[rootB] = rootA
    } else {
      this.parents[rootA] = rootB
    }
    return true
  }
}

export function NetworkCanvas({
  className = "",
  numNodes = 60,
  addEdge = 5,
  speed = 3,
  force = 4,
}: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])
  const animationRef = useRef<number | null>(null)
  const { resolvedTheme } = useTheme()

  const num = numNodes
  const max = Math.round((addEdge / 100) * num)
  const sp = speed * 0.0001
  const frc = force * 0.000001
  const wght = 0.5

  const fade = -0.02
  const fin = 0.06
  const fout = 0.03

  const createForces = useCallback((nodes: Node[]) => {
    const del: number[] = new Array(nodes.length * 2).fill(0)

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = 0; j < i; j++) {
        const b = nodes[j]
        let dx = a.px - b.px
        let dy = a.py - b.py
        const dist = dx * dx + dy * dy
        const calc = frc / (Math.sqrt(dist) * (dist + 0.00001))
        dx *= calc
        dy *= calc
        del[i * 2 + 0] += dx
        del[i * 2 + 1] += dy
        del[j * 2 + 0] -= dx
        del[j * 2 + 1] -= dy
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].px += del[i * 2 + 0]
      nodes[i].py += del[i * 2 + 1]
    }
  }, [frc])

  const updateNodes = useCallback(
    (nw: number, nh: number, nodes: Node[]): Node[] => {
      const _w = nw / Math.max(nw, nh)
      const _h = nh / Math.max(nw, nh)
      const narr: Node[] = []

      nodes.forEach((node, idx) => {
        node.px += node.vx * sp
        node.py += node.vy * sp
        node.vx = node.vx * 0.99 + (Math.random() - 0.5) * 0.3
        node.vy = node.vy * 0.99 + (Math.random() - 0.5) * 0.3

        if (
          idx >= num ||
          node.px < fade ||
          _w - node.px < fade ||
          node.py < fade ||
          _h - node.py < fade
        ) {
          node.opac = Math.max(node.opac - fout, 0)
        } else {
          node.opac = Math.min(node.opac + fin, 1)
        }

        if (node.opac > 0) {
          narr.push(node)
        }
      })

      for (let i = narr.length; i < num; i++) {
        narr.push({
          px: Math.random() * _w,
          py: Math.random() * _h,
          rad: (Math.pow(Math.random(), 2) + 0.35) * 0.015,
          vx: 0.0,
          vy: 0.0,
          opac: 0.0,
        })
      }

      createForces(narr)
      return narr
    },
    [num, sp, fade, fout, fin, createForces]
  )

  const isEdge = (arr: Edge[], edge: Edge): boolean => {
    for (let i = 0; i < arr.length; i++) {
      const elem = arr[i]
      if (
        (elem.a === edge.a && elem.b === edge.b) ||
        (elem.a === edge.b && elem.b === edge.a)
      ) {
        return true
      }
    }
    return false
  }

  const calcSum = useCallback(
    (nodes: Node[]): [number, number, number][] => {
      const result: [number, number, number][] = []
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = 0; j < i; j++) {
          const b = nodes[j]
          let nwght = Math.hypot(a.px - b.px, a.py - b.py)
          nwght /= Math.pow(a.rad * b.rad, wght)
          result.push([nwght, i, j])
        }
      }
      result.sort((a, b) => a[0] - b[0])
      return result
    },
    [wght]
  )

  const calcMST = useCallback(
    (sum: [number, number, number][], nodes: Node[]): Edge[] => {
      const result: Edge[] = []
      const ds = new DisjointSet(nodes.length)
      for (let i = 0; i < sum.length && result.length < nodes.length - 1; i++) {
        const edge = sum[i]
        const j = edge[1]
        const k = edge[2]
        if (ds.connect(j, k)) {
          result.push({ a: nodes[j], b: nodes[k], opac: 0 })
        }
      }
      return result
    },
    []
  )

  const updateEdges = useCallback(
    (nodes: Node[], edges: Edge[]): Edge[] => {
      const sum = calcSum(nodes)
      const mst = calcMST(sum, nodes)

      for (let i = 0; i < sum.length && mst.length < nodes.length - 1 + max; i++) {
        const edge: Edge = { a: nodes[sum[i][1]], b: nodes[sum[i][2]], opac: 0 }
        if (!isEdge(mst, edge)) {
          mst.push(edge)
        }
      }

      const tree: Edge[] = []
      edges.forEach((edge) => {
        if (isEdge(mst, edge)) {
          edge.opac = Math.min(edge.opac + fin, 1)
        } else {
          edge.opac = Math.max(edge.opac - fout, 0)
        }
        if (edge.opac > 0 && edge.a.opac > 0 && edge.b.opac > 0) {
          tree.push(edge)
        }
      })

      for (let i = 0; i < mst.length && tree.length < nodes.length - 1 + max; i++) {
        const edge = mst[i]
        if (!isEdge(tree, edge)) {
          edge.opac = 0.0
          tree.push(edge)
        }
      }
      return tree
    },
    [max, fin, fout, calcSum, calcMST]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const isDark = resolvedTheme === "dark"

    const bgColor = isDark ? "#374151" : "#C5CFC6"

    const nodeGradientColors = isDark
      ? {
          inner: "#1e293b",
          mid: "#1e293b",
          midOut: "#10b981",
          midOutAlt: "#10b981",
          outer: "#064e3b",
        }
      : {
          inner: "#C5CFC6",
          mid: "#C5CFC6",
          midOut: "#F8EDD1",
          midOutAlt: "#F8EDD1",
          outer: "#9D9D93",
        }

    const edgeGradientColors = isDark
      ? {
          start: "#10b981",
          mid: "#059669",
          midOut: "#10b981",
          end: "#064e3b",
        }
      : {
          start: "#F8EDD1",
          mid: "#C5CFC6",
          midOut: "#F8EDD1",
          end: "#9D9D93",
        }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const sz = Math.max(w, h)

      nodesRef.current = updateNodes(w, h, nodesRef.current)
      edgesRef.current = updateEdges(nodesRef.current, edgesRef.current)

      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, w, h)

      nodesRef.current.forEach((node) => {
        const g1 = ctx.createRadialGradient(
          node.px * sz,
          node.py * sz,
          0,
          node.px * sz,
          node.py * sz,
          node.rad * sz
        )
        g1.addColorStop(0.0, nodeGradientColors.inner)
        g1.addColorStop(0.3, nodeGradientColors.mid)
        g1.addColorStop(0.4, nodeGradientColors.midOut)
        g1.addColorStop(0.6, nodeGradientColors.midOutAlt)
        g1.addColorStop(1.0, nodeGradientColors.outer)
        ctx.fillStyle = g1
        ctx.beginPath()
        ctx.arc(node.px * sz, node.py * sz, node.rad * sz, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.lineWidth = sz / 800
      edgesRef.current.forEach((edge) => {
        const a = edge.a
        const b = edge.b
        let dx = a.px - b.px
        let dy = a.py - b.py
        const fx = Math.hypot(dx, dy)
        if (fx > a.rad + b.rad) {
          dx /= fx
          dy /= fx
          const g2 = ctx.createLinearGradient(
            (a.px - dx * a.rad) * sz,
            (a.py - dy * a.rad) * sz,
            (b.px + dx * b.rad) * sz,
            (b.py + dy * b.rad) * sz
          )
          g2.addColorStop(0.0, edgeGradientColors.start)
          g2.addColorStop(0.5, edgeGradientColors.mid)
          g2.addColorStop(0.8, edgeGradientColors.midOut)
          g2.addColorStop(1.0, edgeGradientColors.end)
          ctx.fillStyle = g2
          ctx.strokeStyle = g2
          ctx.beginPath()
          ctx.moveTo((a.px - dx * a.rad) * sz, (a.py - dy * a.rad) * sz)
          ctx.lineTo((b.px + dx * b.rad) * sz, (b.py + dy * b.rad) * sz)
          ctx.stroke()
        }
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    resize()

    for (let i = 0; i < 400; i++) {
      createForces(nodesRef.current)
    }
    edgesRef.current = []
    nodesRef.current.concat(edgesRef.current as unknown as Node[]).forEach((item) => {
      item.opac = 1
    })

    draw()

    const handleResize = () => {
      resize()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [resolvedTheme, updateNodes, updateEdges, createForces])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: "none" }}
    />
  )
}
