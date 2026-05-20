// @ts-nocheck
"use client"

/**
 * MYCALiveDemoBackground - Three.js animated data streams behind Live Demo
 * Reacts to chat activity: speed, signal count, bursts based on messages and responses.
 * No GUI - fully driven by MYCA interaction state.
 * Created: Feb 17, 2026
 */

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { useMYCA } from "@/contexts/myca-context"
import { cn } from "@/lib/utils"

type FlowDirection = "user-to-myca" | "myca-to-user" | "idle"

interface ActivityRefs {
  isLoading: boolean
  messageCount: number
  lastUserLength: number
  lastResponseLength: number
  draftLength: number
  burstRequested: boolean
  flowDirection: FlowDirection
}

export function MYCALiveDemoBackground({
  className,
  transparent = false,
  active = true,
}: {
  className?: string
  transparent?: boolean
  active?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationActiveRef = useRef(active)
  const wakeAnimationRef = useRef<() => void>(() => {})
  const activityRef = useRef<ActivityRefs>({
    isLoading: false,
    messageCount: 0,
    lastUserLength: 0,
    lastResponseLength: 0,
    draftLength: 0,
    burstRequested: false,
    flowDirection: "idle",
  })
  const prevRef = useRef({
    messageCount: 0,
    responseKey: "",
    wasLoading: false,
    draftVersion: 0,
  })
  const { isLoading, messages, lastResponseMetadata, draftActivity } = useMYCA()
  const activityMode = isLoading
    ? "loading"
    : draftActivity.length > 0
      ? "typing"
      : lastResponseMetadata
        ? "responding"
        : "idle"

  useEffect(() => {
    animationActiveRef.current = active
    if (active) wakeAnimationRef.current()
  }, [active])

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
    const typingChanged = draftActivity.length > 0 && draftActivity.version !== prev.draftVersion

    let flowDirection: FlowDirection = "idle"
    if (isLoading || draftActivity.length > 0) {
      flowDirection = "user-to-myca"
    } else if (lastResponseMetadata) {
      flowDirection = "myca-to-user"
    }

    prevRef.current = {
      messageCount: messages.length,
      responseKey,
      wasLoading: isLoading,
      draftVersion: draftActivity.version,
    }

    activityRef.current = {
      isLoading,
      messageCount: messages.length,
      lastUserLength: Math.max(lastUser?.content?.length ?? 0, draftActivity.length),
      lastResponseLength: lastAssistant?.content?.length ?? 0,
      draftLength: draftActivity.length,
      burstRequested: newMessage || newResponse || loadingStarted || typingChanged,
      flowDirection,
    }

    if (flowDirection === "myca-to-user") {
      const t = setTimeout(() => {
        activityRef.current.flowDirection = "idle"
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [draftActivity, isLoading, messages, lastResponseMetadata])

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return

    let disposed = false
    let cleanupFn: (() => void) | undefined

    const init = () => {
      if (disposed || !containerRef.current) return

      const container = containerRef.current
      const width = container.clientWidth
      const height = container.clientHeight

      const scene = new THREE.Scene()
      scene.background = transparent ? null : new THREE.Color("#080808")
      scene.fog = transparent ? null : new THREE.FogExp2("#080808", 0.002)

      const camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        1000
      )
      camera.position.set(0, 0, 90)
      camera.lookAt(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x080808, transparent ? 0 : 0.4)

      if (disposed || !containerRef.current) {
        renderer.dispose()
        return
      }

      container.appendChild(renderer.domElement)

      const contentGroup = new THREE.Group()
      const pathWidth = 150
      const pathCenterX = 25
      const pathRightExtent = 50
      const scale = Math.max(
        (width / 2 + 24) / pathRightExtent,
        (width * 1.15) / pathWidth
      )
      contentGroup.position.set(pathCenterX, 0, 0)
      contentGroup.scale.set(scale, scale, 1)
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
      const lineOpacity = 0.58

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
        color: "#6b7a8a",
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

      const signalColor1 = new THREE.Color("#b8dcff")
      const signalColor2 = new THREE.Color("#5eead4")
      const signalColor3 = new THREE.Color("#c4b5fd")

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
      let frameId: number | null = null
      let frameScheduled = false

      const scheduleFrame = () => {
        if (disposed || frameScheduled || !animationActiveRef.current) return
        frameScheduled = true
        frameId = requestAnimationFrame(animate)
      }

      function animate() {
        frameScheduled = false
        if (disposed) return
        const time = clock.getElapsedTime()
        const act = activityRef.current

        // Derive params from chat activity
        const baseSpeed = 0.25
        const typingActive = act.draftLength > 0
        const activeSpeed =
          act.isLoading || typingActive
            ? 0.9 + (act.lastUserLength / 360) * 0.65
            : baseSpeed
        const responseBoost = act.lastResponseLength > 0 ? Math.min(1.5, 0.5 + act.lastResponseLength / 800) : 1
        const speedGlobal = activeSpeed * responseBoost

        const baseSignals = 50
        const activeSignals = act.isLoading || typingActive ? 130 : baseSignals
        const messageBoost = Math.min(80, act.messageCount * 4)
        const targetSignalCount = Math.min(180, activeSignals + messageBoost)

        if (act.burstRequested) {
          const toAdd = Math.min(18, Math.max(5, Math.floor(Math.max(act.lastResponseLength, act.draftLength) / 80) || 5))
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

        const trailLength = Math.min(26, Math.max(4, Math.floor(6 + act.lastUserLength / 42)))
        const waveHeightVal = 0.1 + (act.isLoading || typingActive ? 0.12 : 0)
        const waveSpeedVal = waveSpeed + (act.isLoading || typingActive ? 1.8 : 0)

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
        scheduleFrame()
      }

      wakeAnimationRef.current = scheduleFrame
      animate()

      const onResize = () => {
        if (!containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        ;(camera as THREE.OrthographicCamera).left = -w / 2
        ;(camera as THREE.OrthographicCamera).right = w / 2
        ;(camera as THREE.OrthographicCamera).top = h / 2
        ;(camera as THREE.OrthographicCamera).bottom = -h / 2
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
        composer.setSize(w, h)
        bloomPass.resolution.set(w, h)
        const pathRightExtent = 50
        const newScale = Math.max(
          (w / 2 + 24) / pathRightExtent,
          (w * 1.15) / 150
        )
        contentGroup.scale.set(newScale, newScale, 1)
      }

      window.addEventListener("resize", onResize)
      const ro = new ResizeObserver(onResize)
      ro.observe(container)

      let cleaned = false
      return () => {
        if (cleaned) return
        cleaned = true
        disposed = true
        if (frameId !== null) cancelAnimationFrame(frameId)
        wakeAnimationRef.current = () => {}
        window.removeEventListener("resize", onResize)
        ro.disconnect()
        backgroundLines.forEach((l) => l.geometry.dispose())
        signals.forEach((s) => {
          contentGroup.remove(s.mesh)
          s.mesh.geometry.dispose()
        })
        renderer.dispose()
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }
    }

    try {
      const cleanup = init()
      if (disposed) {
        if (typeof cleanup === "function") cleanup()
      } else {
        cleanupFn = cleanup
      }
    } catch {
      cleanupFn = undefined
    }

    return () => {
      disposed = true
      cleanupFn?.()
    }
  }, [transparent])

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none",
        "opacity-60",
        className
      )}
      data-myca-bg-mode={activityMode}
      data-myca-draft-length={draftActivity.length}
      aria-hidden
    />
  )
}
