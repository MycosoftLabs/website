"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

const vertexShader = `
attribute vec3 position;

void main()	{
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float xScale;
uniform float yScale;
uniform float distortion;
uniform float lightMode;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  float d = length(p) * distortion;

  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
  float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
  float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

  vec3 signal = vec3(r, g, b);
  vec3 lightSignal = vec3(1.0) - clamp(signal * 0.72, 0.0, 0.92);
  vec3 darkSignal = signal;

  gl_FragColor = vec4(mix(darkSignal, lightSignal, lightMode), 1.0);
}
`

export function MycobrainSensorFabricBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current

    if (!root || !canvas) return

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, 1, 0, -1)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
    const uniforms = {
      resolution: { value: new THREE.Vector2(1, 1) },
      time: { value: 0.0 },
      xScale: { value: 1.0 },
      yScale: { value: 0.5 },
      distortion: { value: 0.05 },
      lightMode: { value: 0.0 },
    }
    const geometry = new THREE.BufferGeometry()
    const positions = new THREE.BufferAttribute(
      new Float32Array([
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
      ]),
      3,
    )
    const material = new THREE.RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)

    geometry.setAttribute("position", positions)
    scene.add(mesh)
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains("dark")
      uniforms.lightMode.value = isDark ? 0.0 : 1.0
      renderer.setClearColor(new THREE.Color(isDark ? 0x666666 : 0xffffff))
    }

    let frame = 0
    let isVisible = true

    const resize = () => {
      const width = Math.max(1, root.clientWidth)
      const height = Math.max(1, root.clientHeight)

      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(width, height, false)
      uniforms.resolution.value.set(canvas.width, canvas.height)
      camera.updateProjectionMatrix()
    }

    const render = () => {
      frame = window.requestAnimationFrame(render)
      if (!isVisible || document.hidden) return

      uniforms.time.value += 0.01
      renderer.render(scene, camera)
    }

    const resizeObserver = new ResizeObserver(resize)
    const themeObserver = new MutationObserver(syncTheme)
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.01 },
    )

    resizeObserver.observe(root)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    visibilityObserver.observe(root)
    syncTheme()
    resize()
    render()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      visibilityObserver.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0 bg-white dark:bg-[#666666]">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
