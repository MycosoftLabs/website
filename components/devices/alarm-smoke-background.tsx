"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

function makeAlarmTextTexture() {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext("2d")

  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = "900 190px Arial, Helvetica, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "rgba(255, 52, 52, 0.94)"
  ctx.shadowColor = "rgba(255, 20, 20, 0.95)"
  ctx.shadowBlur = 42
  ctx.fillText("ALARM", canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function AlarmSmokeBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let width = container.clientWidth || window.innerWidth
    let height = container.clientHeight || window.innerHeight
    let animationFrame = 0
    let delta = 0
    let cubeSineDriver = 0

    const clock = new THREE.Clock()
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    renderer.domElement.className = "h-full w-full"
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000)
    camera.position.z = 1000
    scene.add(camera)

    const geometry = new THREE.BoxGeometry(200, 200, 200)
    const material = new THREE.MeshLambertMaterial({ color: 0xaa6666, wireframe: false })
    const mesh = new THREE.Mesh(geometry, material)

    const textGeo = new THREE.PlaneGeometry(520, 260)
    const textTexture = makeAlarmTextTexture()
    const textMaterial = new THREE.MeshLambertMaterial({
      color: 0xff3333,
      opacity: 1,
      map: textTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const text = new THREE.Mesh(textGeo, textMaterial)
    text.position.z = 800
    scene.add(text)

    const light = new THREE.DirectionalLight(0xffffff, 0.5)
    light.position.set(-1, 0, 1)
    scene.add(light)

    const textureLoader = new THREE.TextureLoader()
    textureLoader.setCrossOrigin("")
    const smokeTexture = textureLoader.load("https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png")
    const smokeMaterial = new THREE.MeshLambertMaterial({
      color: 0xff2d2d,
      map: smokeTexture,
      transparent: true,
      depthWrite: false,
    })
    const smokeGeo = new THREE.PlaneGeometry(300, 300)
    const smokeParticles: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>[] = []

    for (let p = 0; p < 150; p += 1) {
      const particle = new THREE.Mesh(smokeGeo, smokeMaterial)
      particle.position.set(Math.random() * 500 - 250, Math.random() * 500 - 250, Math.random() * 1000 - 100)
      particle.rotation.z = Math.random() * 360
      scene.add(particle)
      smokeParticles.push(particle)
    }

    const resize = () => {
      width = container.clientWidth || window.innerWidth
      height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)

    const evolveSmoke = () => {
      let sp = smokeParticles.length
      while (sp--) {
        smokeParticles[sp].rotation.z += delta * 0.2
      }
    }

    const render = () => {
      mesh.rotation.x += 0.005
      mesh.rotation.y += 0.01
      cubeSineDriver += 0.01
      mesh.position.z = 100 + Math.sin(cubeSineDriver) * 500
      renderer.render(scene, camera)
    }

    const animate = () => {
      delta = clock.getDelta()
      animationFrame = requestAnimationFrame(animate)
      evolveSmoke()
      render()
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      container.removeChild(renderer.domElement)
      smokeParticles.forEach((particle) => scene.remove(particle))
      scene.remove(text)
      geometry.dispose()
      material.dispose()
      textGeo.dispose()
      textTexture.dispose()
      textMaterial.dispose()
      smokeGeo.dispose()
      smokeTexture.dispose()
      smokeMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
