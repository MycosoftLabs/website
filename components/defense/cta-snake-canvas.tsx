 "use client"

 import { useEffect, useRef } from "react"

 interface CtaSnakeCanvasProps {
   className?: string
 }

 export function CtaSnakeCanvas({ className = "" }: CtaSnakeCanvasProps) {
   const containerRef = useRef<HTMLDivElement>(null)
   const canvasRef = useRef<HTMLCanvasElement>(null)

   useEffect(() => {
     const canvas = canvasRef.current
     const container = containerRef.current
     if (!canvas || !container) return

     const ctx = canvas.getContext("2d")
     if (!ctx) return

     let chains: Chain[] = []
     let w = 0
     let h = 0
     let cx = 0
     let cy = 0
     let mx = 0
     let my = 0
     let md = 0
     let tick = 0
     const chainCount = 50
     const entityCount = 8
     const maxa = 2
     const maxv = 1
     const avoidTick = 20
     const avoidThresh = 50
     let frame: number | null = null

     const rand = (min: number, max: number) => Math.random() * (max - min) + min

     function Impulse() {
       this.x = cx
       this.y = cy
       this.ax = 0
       this.ay = 0
       this.vx = 0
       this.vy = 0
       this.r = 1
     }

     Impulse.prototype.step = function () {
       this.x += this.vx
       this.y += this.vy
       if (this.x + this.r >= w || this.x <= this.r) {
         this.vx = 0
         this.ax = 0
       }
       if (this.y + this.r >= h || this.y <= this.r) {
         this.vy = 0
         this.ay = 0
       }
       if (this.x + this.r >= w) this.x = w - this.r
       if (this.x <= this.r) this.x = this.r
       if (this.y + this.r >= h) this.y = h - this.r
       if (this.y <= this.r) this.y = this.r

       if (md) {
         let dx = this.x - mx
         let dy = this.y - my
         let dist = Math.sqrt(dx * dx + dy * dy)
         dist = rand(50, 150)
         let angle = Math.atan2(dy, dx) - Math.PI / 2
         let frac = 0.02
         this.vx -= Math.cos(angle) * dist * frac
         this.vy -= Math.sin(angle) * dist * frac

         let dx2 = this.x - mx
         let dy2 = this.y - my
         let dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
         let angle2 = Math.atan2(dy2, dx2)
         let frac2 = 0.01
         this.vx -= Math.cos(angle2) * dist2 * frac2
         this.vy -= Math.sin(angle2) * dist2 * frac2
       }

       let angle = rand(0, 1) * Math.PI
       let magnitude = rand(-0.4, 0.4)
       this.ax += Math.cos(angle) * magnitude
       this.ay += Math.sin(angle) * magnitude

       this.vx += this.ax
       this.vy += this.ay
       this.ax *= Math.abs(this.ax) > maxa ? 0.75 : 1
       this.ay *= Math.abs(this.ay) > maxa ? 0.75 : 1
       this.vx *= Math.abs(this.vx) > maxv ? 0.75 : 1
       this.vy *= Math.abs(this.vy) > maxv ? 0.75 : 1
     }

     function Chain() {
       this.branches = []
       this.impulse = new Impulse()
       this.branches.push(
         new Branch({
           chain: this,
           attractor: this.impulse,
         }),
       )
     }

     Chain.prototype.step = function () {
       this.impulse.step()
       this.branches.forEach((branch: Branch) => branch.step())
       this.branches.forEach((branch: Branch) => branch.draw())
     }

     function Branch(opt: { chain: Chain; attractor: Impulse }) {
       this.entities = []
       this.chain = opt.chain
       this.avoiding = 0
       for (let i = 0; i < entityCount; i++) {
         const entity = new Entity({
           branch: this,
           i,
           x: cx,
           y: cy,
           radius: 1 + ((entityCount - i) / entityCount) * 5,
           damp: 0.2,
           attractor: i === 0 ? opt.attractor : this.entities[i - 1],
         })
         this.entities.push(entity)
       }
     }

     Branch.prototype.step = function () {
       let i = chains.length
       while (i--) {
         const impulse = this.chain.impulse
         const other = chains[i].impulse
         const dx = other.x - impulse.x
         const dy = other.y - impulse.y
         const dist = Math.sqrt(dx * dx + dy * dy)
         if (!md && impulse !== other && dist < avoidThresh) {
           impulse.ax = 0
           impulse.ay = 0
           impulse.vx -= dx * 0.1
           impulse.vy -= dy * 0.1
           this.avoiding = avoidTick
         }
       }

       this.entities.forEach((entity: Entity) => entity.step())
       if (this.avoiding > 0) this.avoiding--
     }

     Branch.prototype.draw = function () {
       ctx.beginPath()
       ctx.moveTo(this.entities[0].x, this.entities[0].y)
       this.entities.forEach((entity: Entity, i: number) => {
         if (i > 0) ctx.lineTo(entity.x, entity.y)
       })
       ctx.strokeStyle = `hsla(${md ? 120 : this.avoiding ? 0 : 200}, 70%, 60%, 0.3)`
       ctx.stroke()

       this.entities.forEach((entity: Entity, i: number) => {
         ctx.save()
         ctx.translate(entity.x, entity.y)
         ctx.beginPath()
         ctx.rotate(entity.rot)
         if (entity.i === 0) {
           ctx.fillStyle = md ? "#6c6" : this.avoiding ? "#c66" : "#6bf"
         } else {
           ctx.fillStyle = `hsla(${md ? 120 : this.avoiding ? 0 : 200}, 70%, ${Math.min(
             50,
             5 + (entity.av / maxv) * 20,
           )}%, ${((entityCount - i) / entityCount).toFixed(2)})`
         }
         ctx.fillRect(-entity.radius, -entity.radius, entity.radius * 2, entity.radius * 2)
         ctx.restore()
       })
     }

     function Entity(opt: {
       branch: Branch
       i: number
       x: number
       y: number
       radius: number
       attractor: Entity | Impulse
       damp: number
     }) {
       this.branch = opt.branch
       this.i = opt.i
       this.x = opt.x
       this.y = opt.y
       this.vx = 0
       this.vy = 0
       this.radius = opt.radius
       this.attractor = opt.attractor
       this.damp = opt.damp
     }

     Entity.prototype.step = function () {
       this.vx = (this.attractor.x - this.x) * this.damp
       this.vy = (this.attractor.y - this.y) * this.damp
       this.x += this.vx
       this.y += this.vy
       this.av = (Math.abs(this.vx) + Math.abs(this.vy)) / 2

       const dx = this.attractor.x - this.x
       const dy = this.attractor.y - this.y
       this.rot = Math.atan2(dy, dx)
     }

     const resize = () => {
       const rect = container.getBoundingClientRect()
       w = Math.max(1, rect.width)
       h = Math.max(1, rect.height)
       canvas.width = w * window.devicePixelRatio
       canvas.height = h * window.devicePixelRatio
       canvas.style.width = `${w}px`
       canvas.style.height = `${h}px`
       ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
       cx = w / 2
       cy = h / 2
       mx = cx
       my = cy
     }

     const loop = () => {
       frame = requestAnimationFrame(loop)
       ctx.globalCompositeOperation = "source-over"
       ctx.fillStyle = "rgba(11, 18, 32, 0.35)"
       ctx.fillRect(0, 0, w, h)
       ctx.globalCompositeOperation = "lighter"
       chains.forEach((chain) => chain.step())
       tick++
     }

     const onPointerDown = () => {
       md = 1
     }

     const onPointerUp = () => {
       md = 0
     }

     const onPointerMove = (e: PointerEvent) => {
       const rect = container.getBoundingClientRect()
       mx = e.clientX - rect.left
       my = e.clientY - rect.top
     }

     resize()
     chains = Array.from({ length: chainCount }, () => new Chain())

     window.addEventListener("pointerdown", onPointerDown)
     window.addEventListener("pointerup", onPointerUp)
     container.addEventListener("pointerleave", onPointerUp)
     window.addEventListener("pointermove", onPointerMove)
     window.addEventListener("resize", resize)

     frame = requestAnimationFrame(loop)

     return () => {
       if (frame) cancelAnimationFrame(frame)
       window.removeEventListener("pointerdown", onPointerDown)
       window.removeEventListener("pointerup", onPointerUp)
       container.removeEventListener("pointerleave", onPointerUp)
       window.removeEventListener("pointermove", onPointerMove)
       window.removeEventListener("resize", resize)
     }
   }, [])

   return (
     <div ref={containerRef} className={`absolute inset-0 ${className}`} aria-hidden="true">
       <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
     </div>
   )
 }
