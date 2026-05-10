"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

type DataGlobeProps = {
  className?: string
}

type GlobeDataset = [string, number[]]

function colorFromMagnitude(value: number) {
  const color = new THREE.Color()
  color.setHSL(0.441 + value / 2, 0.6, 0.75)
  color.lerp(new THREE.Color(0xffffff), 0.22)
  return color
}

function latLngToVector(lat: number, lng: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((180 - lng) * Math.PI) / 180

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

export function DataGlobe({ className = "" }: DataGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const group = new THREE.Group()
    const radius = 200
    const target = { x: Math.PI * 1.05, y: Math.PI / 8 }
    const rotation = { x: Math.PI * 1.05, y: Math.PI / 8 }
    let distance = 900
    let distanceTarget = 900
    let frame = 0
    let alive = true

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    container.appendChild(renderer.domElement)
    scene.add(group)

    const texture = new THREE.TextureLoader().load("/assets/about-globe/world.jpg")
    texture.colorSpace = THREE.SRGBColorSpace

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: texture },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec2 vUv;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.05);
            vNormal = normalize(normalMatrix * normal);
            vUv = uv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          varying vec3 vNormal;
          varying vec2 vUv;
          void main() {
            vec3 diffuse = texture2D(uTexture, vUv).xyz;
            float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
            vec3 atmosphere = vec3(0.0, 1.0, 1.0) * pow(intensity, 3.0);
            gl_FragColor = vec4(diffuse + atmosphere, 0.62);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    )
    earth.rotation.y = Math.PI
    group.add(earth)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 12.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * intensity;
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    atmosphere.scale.set(1.1, 1.1, 1.1)
    group.add(atmosphere)

    const resize = () => {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    fetch("/assets/about-globe/population909500.json")
      .then((response) => response.json())
      .then((datasets: GlobeDataset[]) => {
        if (!alive) return

        const data = datasets[datasets.length - 1]?.[1] ?? []
        const pointCount = Math.floor(data.length / 3)
        const barGeometry = new THREE.BoxGeometry(1.6, 1.6, 1)
        barGeometry.translate(0, 0, 0.5)

        const material = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 1,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
        })
        const bars = new THREE.InstancedMesh(barGeometry, material, pointCount)
        bars.renderOrder = 4
        const linePositions = new Float32Array(pointCount * 6)
        const lineColors = new Float32Array(pointCount * 6)
        const dummy = new THREE.Object3D()
        const zAxis = new THREE.Vector3(0, 0, 1)

        for (let i = 0; i < pointCount; i += 1) {
          const index = i * 3
          const lat = data[index]
          const lng = data[index + 1]
          const magnitude = data[index + 2]
          const size = Math.max(magnitude * 520, 18)
          const surface = latLngToVector(lat, lng, radius)
          const normal = surface.clone().normalize()
          const tip = surface.clone().add(normal.clone().multiplyScalar(size))
          const color = colorFromMagnitude(magnitude)

          dummy.position.copy(surface)
          dummy.quaternion.setFromUnitVectors(zAxis, normal)
          dummy.scale.set(1, 1, size)
          dummy.updateMatrix()
          bars.setMatrixAt(i, dummy.matrix)
          bars.setColorAt(i, color)

          const lineIndex = i * 6
          linePositions[lineIndex] = surface.x
          linePositions[lineIndex + 1] = surface.y
          linePositions[lineIndex + 2] = surface.z
          linePositions[lineIndex + 3] = tip.x
          linePositions[lineIndex + 4] = tip.y
          linePositions[lineIndex + 5] = tip.z

          lineColors[lineIndex] = color.r
          lineColors[lineIndex + 1] = color.g
          lineColors[lineIndex + 2] = color.b
          lineColors[lineIndex + 3] = 1
          lineColors[lineIndex + 4] = 1
          lineColors[lineIndex + 5] = 1
        }

        bars.instanceMatrix.needsUpdate = true
        if (bars.instanceColor) bars.instanceColor.needsUpdate = true
        group.add(bars)

        const lineGeometry = new THREE.BufferGeometry()
        lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3))
        lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3))
        const lines = new THREE.LineSegments(
          lineGeometry,
          new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
          }),
        )
        lines.renderOrder = 6
        group.add(lines)
      })
      .catch(() => {
        // Keep the textured globe even if population data fails.
      })

    const animate = () => {
      frame = requestAnimationFrame(animate)

      rotation.x += 0.005
      rotation.y += (target.y - rotation.y) * 0.1
      distance += (distanceTarget - distance) * 0.08

      camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y)
      camera.position.y = distance * Math.sin(rotation.y)
      camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y)
      camera.lookAt(group.position)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      texture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className={`overflow-hidden ${className}`} aria-hidden="true" />
}
