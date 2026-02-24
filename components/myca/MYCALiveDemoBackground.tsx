"use client"

/**
 * MYCALiveDemoBackground - Three.js animated data streams behind Live Demo
 * Reacts to chat activity: speed, signal count, bursts based on messages and responses.
 * No GUI - fully driven by MYCA interaction state.
 * Created: Feb 17, 2026
 */

import { useEffect, useRef } from "react"
import { useMYCA } from "@/contexts/myca-context"
import { cn } from "@/lib/utils"

type FlowDirection = "user-to-myca" | "myca-to-user" | "idle"

interface ActivityRefs {
  isLoading: boolean
  messageCount: number
  lastUserLength: number
  lastResponseLength: number
  burstRequested: boolean
  flowDirection: FlowDirection
}

export function MYCALiveDemoBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<ActivityRefs>({
    isLoading: false,
    messageCount: 0,
    lastUserLength: 0,
    lastResponseLength: 0,
    burstRequested: false,
    flowDirection: "idle",
  })
  const prevRef = useRef({
    messageCount: 0,
    responseKey: "",
    wasLoading: false,
  })
  const { isLoading, messages, lastResponseMetadata } = useMYCA()

  // Update activity ref when MYCA state changes; burst only on transitions
  // flowDirection: user→MYCA when sending/thinking, MYCA→user when responding
  useEffect(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    const prev = prevRef.current
    const responseKey = lastResponseMetadata
      ? `${lastResponseMetadata.agent ?? ""}-${lastResponseMetadata.routed_to ?? ""}`
      : ""
    const newMessage = messages.length > prev.messageCount
    const newResponse = responseKey && responseKey !== prev.responseKey
    const loadingStarted = isLoading && !prev.wasLoading

    let flowDirection: FlowDirection = "idle"
    if (isLoading) {
      flowDirection = "user-to-myca"
    } else if (lastResponseMetadata) {
      flowDirection = "myca-to-user"
    }

    prevRef.current = {
      messageCount: messages.length,
      responseKey,
      wasLoading: isLoading,
    }

    activityRef.current = {
      isLoading,
      messageCount: messages.length,
      lastUserLength: lastUser?.content?.length ?? 0,
      lastResponseLength: lastAssistant?.content?.length ?? 0,
      burstRequested: newMessage || newResponse || loadingStarted,
      flowDirection,
    }

    if (flowDirection === "myca-to-user") {
      const t = setTimeout(() => {
        activityRef.current.flowDirection = "idle"
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [isLoading, messages, lastResponseMetadata])

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return

    const init = async () => {
      const THREE = await import("three")
      const { EffectComposer } = await import(
        "three/examples/jsm/postprocessing/EffectComposer.js"
      )
      const { RenderPass } = await import(
        "three/examples/jsm/postprocessing/RenderPass.js"
      )
      const { UnrealBloomPass } = await import(
        "three/examples/jsm/postprocessing/UnrealBloomPass.js"
      )

      const container = containerRef.current!
      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = new THREE.Color("#080808")
      scene.fog = new THREE.FogExp2("#080808", 0.002)

      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
      camera.position.set(0, 0, 90)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x080808, 0.4)
      container.appendChild(renderer.domElement)

      const contentGroup = new THREE.Group()
      const positionX = (50 - 100) / 2
      contentGroup.position.set(positionX, 0, 0)
      scene.add(contentGroup)

      const segmentCount = 150
      const lineCount = 80
      const curveLength = 50
      const straightLength = 100
      const spreadHeight = 30.33
      const spreadDepth = 0
      const curvePower = 0.8265
      const waveSpeed = 2.48
      const waveHeight = 0.145
      const lineOpacity = 0.35

      // 180° flipped: left = single stream (User), right = multiple streams (MYCA)
      function getPathPoint(
        t: number,
        lineIndex: number,
        time: number,
        waveSpeedVal: number,
        waveHeightVal: number
      ) {
        const totalLen = curveLength + straightLength
        const currentX = -curveLength + t * totalLen
        let y = 0
        let z = 0
        const spreadFactor = (lineIndex / lineCount - 0.5) * 2

        if (currentX < 0) {
          const ratio = (currentX + curveLength) / curveLength
          let shapeFactor = (Math.cos(ratio * Math.PI) + 1) / 2
          shapeFactor = Math.pow(shapeFactor, curvePower)
          y = spreadFactor * spreadHeight * shapeFactor
          z = spreadFactor * spreadDepth * shapeFactor
          const wave = Math.sin(time * waveSpeedVal + currentX * 0.1 + lineIndex) * waveHeightVal * shapeFactor
          y += wave
        }
        return new THREE.Vector3(-currentX, y, z)
      }

      const bgMaterial = new THREE.LineBasicMaterial({
        color: "#373f48",
        transparent: true,
        opacity: lineOpacity,
        depthWrite: false,
      })

      const signalMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      })

      const signalColor1 = new THREE.Color("#8fc9ff")
      const signalColor2 = new THREE.Color("#34d399")
      const signalColor3 = new THREE.Color("#a78bfa")

      let backgroundLines: THREE.Line[] = []
      interface Signal {
        mesh: THREE.Line
        laneIndex: number
        speed: number
        progress: number
        history: THREE.Vector3[]
        assignedColor: THREE.Color
      }
      let signals: Signal[] = []
      let signalCount = 60
      const maxTrail = 150

      function createSignal(color?: THREE.Color) {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(maxTrail * 3)
        const colors = new Float32Array(maxTrail * 3)
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
        const mesh = new THREE.Line(geometry, signalMaterial)
        mesh.frustumCulled = false
        mesh.renderOrder = 1
        contentGroup.add(mesh)
        const pick = color ?? [signalColor1, signalColor2, signalColor3][Math.floor(Math.random() * 3)]
        signals.push({
          mesh,
          laneIndex: Math.floor(Math.random() * lineCount),
          speed: 0.2 + Math.random() * 0.5,
          progress: Math.random(),
          history: [],
          assignedColor: pick,
        })
      }

      function rebuildLines() {
        backgroundLines.forEach((l) => {
          contentGroup.remove(l)
          l.geometry.dispose()
        })
        backgroundLines = []
        for (let i = 0; i < lineCount; i++) {
          const geometry = new THREE.BufferGeometry()
          const positions = new Float32Array(segmentCount * 3)
          geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
          const line = new THREE.Line(geometry, bgMaterial)
          ;(line as THREE.Line & { userData: { id: number } }).userData = { id: i }
          line.renderOrder = 0
          contentGroup.add(line)
          backgroundLines.push(line)
        }
      }

      function rebuildSignals(targetCount: number) {
        signals.forEach((s) => {
          contentGroup.remove(s.mesh)
          s.mesh.geometry.dispose()
        })
        signals = []
        signalCount = Math.max(20, Math.min(180, targetCount))
        for (let i = 0; i < signalCount; i++) {
          createSignal()
        }
      }

      rebuildLines()
      rebuildSignals(60)

      const renderScene = new RenderPass(scene, camera)
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        1.5,
        0.4,
        0.85
      )
      bloomPass.threshold = 0
      bloomPass.strength = 2.0
      bloomPass.radius = 0.5

      const composer = new EffectComposer(renderer)
      composer.addPass(renderScene)
      composer.addPass(bloomPass)

      const clock = new THREE.Clock()
      let frameId: number

      function animate() {
        frameId = requestAnimationFrame(animate)
        const time = clock.getElapsedTime()
        const act = activityRef.current

        // Derive params from chat activity
        const baseSpeed = 0.25
        const activeSpeed = act.isLoading ? 0.8 + (act.lastUserLength / 500) * 0.5 : baseSpeed
        const responseBoost = act.lastResponseLength > 0 ? Math.min(1.5, 0.5 + act.lastResponseLength / 800) : 1
        const speedGlobal = activeSpeed * responseBoost

        const baseSignals = 50
        const activeSignals = act.isLoading ? 120 : baseSignals
        const messageBoost = Math.min(80, act.messageCount * 4)
        const targetSignalCount = Math.min(180, activeSignals + messageBoost)

        if (act.burstRequested) {
          const toAdd = Math.min(15, Math.max(3, Math.floor(act.lastResponseLength / 100) || 3))
          for (let i = 0; i < toAdd; i++) createSignal()
          act.burstRequested = false
        }

        if (signals.length < targetSignalCount && !act.burstRequested) {
          const diff = targetSignalCount - signals.length
          for (let i = 0; i < Math.min(diff, 5); i++) createSignal()
        } else if (signals.length > targetSignalCount + 20) {
          const remove = Math.min(10, signals.length - targetSignalCount)
          for (let i = 0; i < remove && signals.length > 20; i++) {
            const s = signals.pop()!
            contentGroup.remove(s.mesh)
            s.mesh.geometry.dispose()
          }
        }

        const trailLength = Math.min(20, Math.max(3, Math.floor(5 + act.lastUserLength / 50)))
        const waveHeightVal = 0.1 + (act.isLoading ? 0.08 : 0)
        const waveSpeedVal = waveSpeed + (act.isLoading ? 1.5 : 0)

        // Update lines
        backgroundLines.forEach((line) => {
          const positions = line.geometry.attributes.position.array as Float32Array
          const lineId = (line as THREE.Line & { userData: { id: number } }).userData.id
          for (let j = 0; j < segmentCount; j++) {
            const t = j / (segmentCount - 1)
            const vec = getPathPoint(t, lineId, time, waveSpeedVal, waveHeightVal)
            positions[j * 3] = vec.x
            positions[j * 3 + 1] = vec.y
            positions[j * 3 + 2] = vec.z
          }
          line.geometry.attributes.position.needsUpdate = true
        })

        // Flipped: left=User (single), right=MYCA (multiple). user-to-myca=L→R (progress-), myca-to-user=R→L (progress+)
        const flowDir = act.flowDirection === "user-to-myca" ? -1 : 1
        signals.forEach((sig) => {
          sig.progress += flowDir * sig.speed * 0.005 * speedGlobal
          if (sig.progress > 1.0) {
            sig.progress = 0
            sig.laneIndex = Math.floor(Math.random() * lineCount)
            sig.history = []
            sig.assignedColor = [signalColor1, signalColor2, signalColor3][
              Math.floor(Math.random() * 3)
            ] as THREE.Color
          }
          if (sig.progress < 0) {
            sig.progress = 1
            sig.laneIndex = Math.floor(Math.random() * lineCount)
            sig.history = []
            sig.assignedColor = [signalColor1, signalColor2, signalColor3][
              Math.floor(Math.random() * 3)
            ] as THREE.Color
          }

          const pos = getPathPoint(sig.progress, sig.laneIndex, time, waveSpeedVal, waveHeightVal)
          sig.history.push(pos.clone())
          if (sig.history.length > trailLength + 1) sig.history.shift()

          const positions = sig.mesh.geometry.attributes.position.array as Float32Array
          const colors = sig.mesh.geometry.attributes.color.array as Float32Array
          const drawCount = Math.max(1, trailLength)
          const currentLen = sig.history.length

          for (let i = 0; i < drawCount; i++) {
            let index = currentLen - 1 - i
            if (index < 0) index = 0
            const p = sig.history[index] ?? new THREE.Vector3()
            positions[i * 3] = p.x
            positions[i * 3 + 1] = p.y
            positions[i * 3 + 2] = p.z
            const alpha = Math.max(0, 1 - i / trailLength)
            colors[i * 3] = sig.assignedColor.r * alpha
            colors[i * 3 + 1] = sig.assignedColor.g * alpha
            colors[i * 3 + 2] = sig.assignedColor.b * alpha
          }
          sig.mesh.geometry.setDrawRange(0, drawCount)
          sig.mesh.geometry.attributes.position.needsUpdate = true
          sig.mesh.geometry.attributes.color.needsUpdate = true
        })

        composer.render()
      }

      animate()

      const onResize = () => {
        if (!containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
        composer.setSize(w, h)
        bloomPass.resolution.set(w, h)
      }

      window.addEventListener("resize", onResize)
      const ro = new ResizeObserver(onResize)
      ro.observe(container)

      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener("resize", onResize)
        ro.disconnect()
        backgroundLines.forEach((l) => l.geometry.dispose())
        signals.forEach((s) => {
          contentGroup.remove(s.mesh)
          s.mesh.geometry.dispose()
        })
        renderer.dispose()
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
      }
    }

    const initPromise = init()

    return () => {
      initPromise
        .then((cleanup) => {
          if (typeof cleanup === "function") cleanup()
        })
        .catch(() => {})
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none",
        "opacity-60",
        className
      )}
      aria-hidden
    />
  )
}
