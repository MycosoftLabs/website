 "use client"

 import { useEffect, useRef } from "react"

 interface ChallengeCanvasProps {
   className?: string
 }

 interface Point {
   x: number
   y: number
 }

 export function ChallengeCanvas({ className = "" }: ChallengeCanvasProps) {
   const containerRef = useRef<HTMLDivElement>(null)
   const canvasRef = useRef<HTMLCanvasElement>(null)

   useEffect(() => {
     const canvas = canvasRef.current
     const container = containerRef.current
     if (!canvas || !container) return

     const ctx = canvas.getContext("2d")
     if (!ctx) return

     const { floor, ceil, random, abs, sqrt, PI, min } = Math
     const TAU = PI * 2
     const DPR = window.devicePixelRatio || 1

     const r = (n: number) => random() * n
     const rrng = (lo: number, hi: number) => lo + r(hi - lo)
     const rint = (lo: number, hi: number) => lo + floor(r(hi - lo + 1))
     const choose1 = <T,>(arr: T[]) => arr[rint(0, arr.length - 1)]
     const dpr = (n: number) => n * DPR

     let W = 0
     let H = 0
     let frame: number | null = null
     let time = 0

     const NODES_PER_BIN = 1
     const DECAY = 0.97
     const BASE_CIRCLES = 20

     class Lattice {
       w: number
       h: number
       res: number
       ncols: number
       nrows: number
       bins: Node[][][]

       constructor(w: number, h: number, res: number) {
         this.w = w
         this.h = h
         this.res = res
         this.ncols = ceil(w / res)
         this.nrows = ceil(h / res)
         this.bins = new Array(this.ncols)
         for (let i = 0; i < this.ncols; i++) {
           this.bins[i] = new Array(this.nrows)
           for (let j = 0; j < this.nrows; j++) {
             const bin = (this.bins[i][j] = new Array(NODES_PER_BIN))
             for (let k = 0; k < bin.length; k++) {
               const x = i * res
               const y = j * res
               bin[k] = new Node(this, rint(x, x + res), rint(y, y + res))
             }
           }
         }
       }

       findAFriend(node: Node, n: number) {
         const col = floor(node.x / this.res)
         const row = floor(node.y / this.res)
         const bins: Node[][][] = []

         for (let c = col - 1; c <= col + 1; c++) {
           const cc = this.bins[c]
           if (!cc) continue
           for (let r = row - 1; r <= row + 1; r++) {
             const bin = cc[r]
             if (Array.isArray(bin)) bins.push(bin)
           }
         }
         const friends = new Array<Node>(n)
         while (n--) friends[n] = choose1(choose1(bins))
         return friends
       }

       findNearest(p: Point) {
         const col = floor(p.x / this.res)
         const row = floor(p.y / this.res)
         let d2 = Infinity
         let closest: Node | undefined

         for (let c = col - 1; c <= col + 1; c++) {
           const cc = this.bins[c]
           if (!cc) continue
           for (let r = row - 1; r <= row + 1; r++) {
             const bin = cc[r]
             if (!Array.isArray(bin)) return
             for (let i = 0; i < NODES_PER_BIN; i++) {
               const noded2 = bin[i].d2(p)
               if (noded2 < d2) {
                 closest = bin[i]
                 d2 = noded2
               }
             }
           }
         }
         return closest
       }

       each(cb: (node: Node) => void) {
         for (let c = 0; c < this.ncols; c++) {
           for (let r = 0; r < this.nrows; r++) {
             const bin = this.bins[c][r]
             for (let i = 0; i < NODES_PER_BIN; i++) cb(bin[i])
           }
         }
       }

       eachActive(cb: (node: Node) => void) {
         this.each((node) => {
           if (!node.isActive) return
           cb(node)
         })
       }
     }

     class Node {
       lattice: Lattice
       x: number
       y: number
       isActive = false
       activatedAt = 0
       friends: Node[] = []
       p = 1

       constructor(lattice: Lattice, x: number, y: number) {
         this.lattice = lattice
         this.x = x
         this.y = y
       }

       activate(t: number, p: number) {
         this.isActive = true
         this.activatedAt = t
         this.friends = this.lattice.findAFriend(this, 3)
         this.p = p
       }

       update(t: number) {
         this.p *= DECAY
         const p = this.p
         if (this.isActive && t - this.activatedAt >= 2) {
           this.isActive = false
           this.friends.forEach((friend) => {
             if (random() < p) friend.activate(t, p)
           })
         }
       }

       d2(p: Point) {
         const dx = this.x - p.x
         const dy = this.y - p.y
         return dx * dx + dy * dy
       }
     }

     class Arr<T> {
       arr: T[]
       len = 0

       constructor(n: number) {
         this.arr = new Array(n)
       }

       push(x: T) {
         this.arr[this.len++] = x
       }

       clear() {
         this.len = 0
       }

       each(cb: (x: T) => void) {
         for (let i = 0; i < this.len; i++) cb(this.arr[i])
       }
     }

     class Circle {
       r: number
       x: number
       y: number
       vx: number
       vy: number

       constructor(r: number, x: number, y: number, vx: number, vy: number) {
         this.r = r
         this.x = x
         this.y = y
         this.vx = vx
         this.vy = vy
       }

       intersections(other: Circle) {
         const dx = this.x - other.x
         const dy = this.y - other.y
         const d = sqrt(dx * dx + dy * dy)

         if (d >= this.r + other.r) return []
         if (d < abs(this.r - other.r)) return []

         const a = (this.r * this.r - other.r * other.r + d * d) / (2 * d)
         const x = this.x - (dx * a) / d
         const y = this.y - (dy * a) / d
         const h = sqrt(this.r * this.r - a * a)
         const rx = (-dy * h) / d
         const ry = (dx * h) / d

         return [
           { x: x + rx, y: y + ry },
           { x: x - rx, y: y - ry },
         ]
       }
     }

     let lattice: Lattice
     let circles: Circle[]
     let intersections: Arr<Point>
     let ons: Arr<Node>

     const resize = () => {
       const rect = container.getBoundingClientRect()
       const w = Math.max(1, rect.width)
       const h = Math.max(1, rect.height)

       canvas.style.width = `${w}px`
       canvas.style.height = `${h}px`

       W = canvas.width = w * DPR
       H = canvas.height = h * DPR
     }

     const init = () => {
       const res = dpr(6)
       lattice = new Lattice(W, H, res)
       ons = new Arr<Node>(floor((W / res) * (H / res) * NODES_PER_BIN))

       const mindim = min(W, H)
       circles = new Array(BASE_CIRCLES)
       for (let i = 0; i < BASE_CIRCLES; i++) {
         circles[i] = new Circle(
           rint(floor(mindim / 8), floor(mindim / 4)),
           rint(0, W),
           rint(0, H),
           rrng(dpr(-2), dpr(2)),
           rrng(dpr(-2), dpr(2)),
         )
       }
       circles.push(new Circle(floor(mindim / 4), W / 2, H / 2, 0, 0))

       intersections = new Arr<Point>(circles.length * circles.length)
     }

     const updateCircles = () => {
       intersections.clear()
       for (let i = 0; i < circles.length; i++) {
         const a = circles[i]
         if (a.x <= -a.r) a.x = W + a.r
         else if (a.x >= W + a.r) a.x = -a.r
         if (a.y <= -a.r) a.y = H + a.r
         else if (a.y >= H + a.r) a.y = -a.r

         for (let j = i + 1; j < circles.length; j++) {
           const ixs = a.intersections(circles[j])
           if (ixs.length) {
             intersections.push(ixs[0])
             intersections.push(ixs[1])
           }
         }

         a.x += a.vx
         a.y += a.vy
       }
     }

     const activateIntersections = () => {
       intersections.each((ix) => {
         const node = lattice.findNearest(ix)
         if (node) node.activate(time, 0.95)
       })
     }

     const drawLines = (nodes: Arr<Node>, color: string, width: number) => {
       ctx.strokeStyle = color
       ctx.lineWidth = width
       ctx.beginPath()
       nodes.each((node) => {
         node.friends.forEach((friend) => {
           ctx.moveTo(node.x, node.y)
           ctx.lineTo(friend.x, friend.y)
         })
       })
       ctx.closePath()
       ctx.stroke()
     }

     const draw = () => {
       ctx.fillStyle = "rgba(34, 49, 63, 0.2)"
       ctx.fillRect(0, 0, W, H)
       updateCircles()
       activateIntersections()

       lattice.eachActive((node) => node.update(time))
       ons.clear()
       lattice.eachActive((node) => {
         if (!node.isActive) return
         ons.push(node)
       })
       drawLines(ons, "rgba(249, 191, 59, 0.3)", dpr(0.5))
     }

     const loop = () => {
       frame = requestAnimationFrame(loop)
       draw()
       time++
     }

     const reset = () => {
       if (frame) cancelAnimationFrame(frame)
       resize()
       ctx.clearRect(0, 0, W, H)
       init()
       time = 0
       frame = requestAnimationFrame(loop)
     }

     const observer = new ResizeObserver(() => reset())
     observer.observe(container)

     reset()

     return () => {
       if (frame) cancelAnimationFrame(frame)
       observer.disconnect()
     }
   }, [])

   return (
     <div
       ref={containerRef}
       className={`absolute inset-0 pointer-events-none ${className}`}
       aria-hidden="true"
     >
       <canvas
         ref={canvasRef}
         className="absolute inset-0 h-full w-full"
         style={{ backgroundColor: "rgb(34, 49, 63)" }}
       />
     </div>
   )
 }
