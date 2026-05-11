"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"
import fontJson from "three/examples/fonts/helvetiker_bold.typeface.json"
import { shouldUseLightweightVisuals } from "@/lib/client-motion"

const vertexShader = `
uniform float uTime;
attribute vec2 aAnimation;
attribute vec3 aControl0;
attribute vec3 aControl1;
attribute vec3 aEndPosition;

vec3 cubicBezier(vec3 p0, vec3 c0, vec3 c1, vec3 p1, float t) {
  float tn = 1.0 - t;
  return tn * tn * tn * p0 + 3.0 * tn * tn * t * c0 + 3.0 * tn * t * t * c1 + t * t * t * p1;
}

void main() {
  float tDelay = aAnimation.x;
  float tDuration = aAnimation.y;
  float tTime = clamp(uTime - tDelay, 0.0, tDuration);
  float tProgress = tTime / tDuration;
  vec3 tPosition = position;
  tPosition *= 1.0 - tProgress;
  tPosition += cubicBezier(position, aControl0, aControl1, aEndPosition, tProgress);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(tPosition, 1.0);
}
`

const fragmentShader = `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
`

function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function createTextAnimation() {
  const font = new FontLoader().parse(fontJson)
  const geometry = new TextGeometry("A G A R I C", {
    font,
    size: 14,
    depth: 1,
    bevelSize: 0.75,
    bevelThickness: 0.5,
    bevelEnabled: true,
    bevelSegments: 1,
    curveSegments: 12,
  })

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) throw new Error("Unable to compute AGARIC text bounds")

  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  const depth = box.max.z - box.min.z
  geometry.translate(width * -0.5, height * -0.5, depth * -0.5)

  const nonIndexed = geometry.toNonIndexed()
  const positions = nonIndexed.getAttribute("position")
  const vertexCount = positions.count
  const faceCount = vertexCount / 3
  const aAnimation = new Float32Array(vertexCount * 2)
  const aControl0 = new Float32Array(vertexCount * 3)
  const aControl1 = new Float32Array(vertexCount * 3)
  const aEndPosition = new Float32Array(vertexCount * 3)
  const length = new THREE.Vector3(width, height, depth).multiplyScalar(0.5).length()
  const maxDelay = length * 0.06

  for (let i = 0; i < faceCount; i += 1) {
    const v0 = i * 3
    const p0 = new THREE.Vector3().fromBufferAttribute(positions, v0)
    const p1 = new THREE.Vector3().fromBufferAttribute(positions, v0 + 1)
    const p2 = new THREE.Vector3().fromBufferAttribute(positions, v0 + 2)
    const centroid = p0.add(p1).add(p2).multiplyScalar(1 / 3)
    const dirX = centroid.x > 0 ? 1 : -1
    const dirY = centroid.y > 0 ? 1 : -1
    const delay = centroid.length() * randFloat(0.03, 0.06)
    const duration = randFloat(2, 4)
    const c0 = new THREE.Vector3(randFloat(0, 30) * dirX, randFloat(60, 120) * dirY, randFloat(-20, 20))
    const c1 = new THREE.Vector3(randFloat(30, 60) * dirX, randFloat(0, 60) * dirY, randFloat(-20, 20))

    for (let v = 0; v < 3; v += 1) {
      const vertex = v0 + v
      aAnimation[vertex * 2] = delay + Math.random()
      aAnimation[vertex * 2 + 1] = duration
      aControl0.set(c0.toArray(), vertex * 3)
      aControl1.set(c1.toArray(), vertex * 3)
      aEndPosition.set([0, 0, 0], vertex * 3)
    }
  }

  nonIndexed.setAttribute("aAnimation", new THREE.BufferAttribute(aAnimation, 2))
  nonIndexed.setAttribute("aControl0", new THREE.BufferAttribute(aControl0, 3))
  nonIndexed.setAttribute("aControl1", new THREE.BufferAttribute(aControl1, 3))
  nonIndexed.setAttribute("aEndPosition", new THREE.BufferAttribute(aEndPosition, 3))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x000000) },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(nonIndexed, material)
  mesh.frustumCulled = false
  mesh.userData.animationDuration = maxDelay + 4 + 1
  return mesh
}

export function AgaricShardTitle() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const lightweight = shouldUseLightweightVisuals()

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setClearColor(0xffffff, 0)
    renderer.setPixelRatio(lightweight ? 1 : Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    root.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(10, 1, 1, 10000)
    camera.position.set(0, 0, 2050)
    const scene = new THREE.Scene()
    const textAnimation = createTextAnimation()
    textAnimation.scale.setScalar(1.9)
    textAnimation.position.y = 42
    scene.add(textAnimation)

    const material = textAnimation.material as THREE.ShaderMaterial
    const animationDuration = textAnimation.userData.animationDuration as number
    let animationProgress = 1
    let tweenTime = 0
    let timeScale = 1
    let dragX = 0
    let dragging = false
    let frame = 0
    let lastRender = 0

    const setProgress = (value: number) => {
      animationProgress = THREE.MathUtils.clamp(value, 0, 1)
      material.uniforms.uTime.value = animationDuration * animationProgress
    }
    setProgress(1)

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    const stop = () => {
      timeScale = 0
    }

    const resume = () => {
      timeScale = 1
      tweenTime = (1 - animationProgress) * 4
    }

    const seek = (dx: number) => {
      setProgress(animationProgress + dx * 0.001)
    }

    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      dragX = event.clientX
      root.setPointerCapture(event.pointerId)
      root.style.cursor = "ew-resize"
      stop()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - dragX
      dragX = event.clientX
      seek(dx)
    }

    const onPointerUp = (event: PointerEvent) => {
      dragging = false
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId)
      root.style.cursor = "pointer"
      resume()
    }

    let last = performance.now()
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (document.hidden || (lightweight && now - lastRender < 50)) return
      lastRender = now
      const delta = (now - last) / 1000
      last = now
      if (!dragging && timeScale > 0) {
        tweenTime += delta * timeScale
        const linear = Math.min(tweenTime / 4, 1)
        const eased = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2
        setProgress(1 - eased)
        if (linear >= 1) timeScale = 0
      }
      renderer.render(scene, camera)
    }

    root.style.cursor = "pointer"
    root.addEventListener("pointerdown", onPointerDown)
    root.addEventListener("pointermove", onPointerMove)
    root.addEventListener("pointerup", onPointerUp)
    root.addEventListener("pointercancel", onPointerUp)
    window.addEventListener("resize", resize)
    resize()
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      root.removeEventListener("pointerdown", onPointerDown)
      root.removeEventListener("pointermove", onPointerMove)
      root.removeEventListener("pointerup", onPointerUp)
      root.removeEventListener("pointercancel", onPointerUp)
      textAnimation.geometry.dispose()
      ;(textAnimation.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="relative -mt-14 -mb-40 flex w-full justify-center">
      <div
        ref={rootRef}
        aria-label="AGARIC animated title"
        className="device-hero-title h-[520px] w-[min(98vw,1280px)] touch-none select-none bg-transparent"
        role="img"
      />
    </div>
  )
}
