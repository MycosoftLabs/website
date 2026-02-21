 "use client"

 import { useEffect, useRef } from "react"

 interface DefenseParticlesProps {
   className?: string
 }

 declare global {
   interface Window {
     particlesJS?: (tagId: string, params: Record<string, unknown>) => void
     pJSDom?: Array<{ pJS?: { fn?: { vendors?: { destory?: () => void } } } }>
   }
 }

 export function DefenseParticles({ className = "" }: DefenseParticlesProps) {
   const frameRef = useRef<number | null>(null)

   useEffect(() => {
     let isMounted = true

     async function initParticles() {
       await import("particles.js")
       if (!isMounted || !window.particlesJS) return

       window.particlesJS("particles-js", {
         particles: {
           number: { value: 534, density: { enable: true, value_area: 200 } },
           color: { value: ["#e2e8f0", "#7dd3fc"] },
           shape: {
             type: "circle",
             stroke: { width: 0, color: "#000000" },
             polygon: { nb_sides: 5 },
             image: { src: "img/github.svg", width: 100, height: 100 },
           },
           opacity: {
             value: 0.45,
             random: false,
             anim: { enable: true, speed: 1, opacity_min: 0.77142949946406, sync: false },
           },
           size: { value: 6, random: true, anim: { enable: true, speed: 40, size_min: 0.1, sync: false } },
           line_linked: { enable: false, distance: 150, color: "#ffffff", opacity: 0.4, width: 1 },
           move: {
             enable: true,
             speed: 4,
             direction: "none",
             random: false,
             straight: false,
             out_mode: "out",
             bounce: false,
             attract: { enable: false, rotateX: 600, rotateY: 1200 },
           },
         },
         interactivity: {
           detect_on: "canvas",
           events: {
             onhover: { enable: true, mode: "bubble" },
             onclick: { enable: true, mode: "push" },
             resize: true,
           },
           modes: {
             grab: { distance: 400, line_linked: { opacity: 1 } },
             bubble: { distance: 250, size: 13, duration: 2, opacity: 1, speed: 3 },
             repulse: { distance: 200, duration: 0.4 },
             push: { particles_nb: 4 },
             remove: { particles_nb: 2 },
           },
         },
         retina_detect: true,
       })

       const update = () => {
         frameRef.current = requestAnimationFrame(update)
       }

       frameRef.current = requestAnimationFrame(update)
     }

     initParticles()

     return () => {
       isMounted = false
       if (frameRef.current) cancelAnimationFrame(frameRef.current)
       const instance = window.pJSDom?.[0]?.pJS
       instance?.fn?.vendors?.destory?.()
       if (window.pJSDom?.length) window.pJSDom.length = 0
     }
   }, [])

  return (
    <div className={`absolute inset-0 opacity-50 ${className}`} aria-hidden="true">
       <div
         id="particles-js"
        className="absolute inset-0 h-full w-full pointer-events-auto"
        style={{ backgroundColor: "#0b1220" }}
       />
     </div>
   )
 }
