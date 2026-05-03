"use client"

/**
 * R3F viewer — circular dish, dual-ish key/fill lights, hyphae lines, instanced organisms,
 * agar tint from chemistry means + client preview sliders.
 * Date: May 02, 2026
 */

import { Suspense, useLayoutEffect, useMemo, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stats } from "@react-three/drei"
import * as THREE from "three"
import type { OrganismInstance, PetriStateSnapshot } from "@/components/petri-dish-v2/types"

const GRID = 128

function toXZ(x: number, y: number): [number, number, number] {
  const nx = (x / GRID - 0.5) * 2.2
  const nz = (y / GRID - 0.5) * 2.2
  return [nx, 0.02, nz]
}

function agarColor(snapshot: PetriStateSnapshot | null, preview: number[]): THREE.Color {
  const c = new THREE.Color("#e8dcc8")
  if (!snapshot?.chemistry_means?.length) return c
  const g = snapshot.chemistry_means[0] ?? 0
  const o = snapshot.chemistry_means[5] ?? 0
  const phBias = (preview[16] ?? 7) / 14
  c.offsetHSL(0.02 * g - 0.05, 0.1 * o, 0.05 * phBias - 0.02)
  return c
}

function DishAgar({
  snapshot,
  preview,
}: {
  snapshot: PetriStateSnapshot | null
  preview: number[]
}) {
  const col = useMemo(() => agarColor(snapshot, preview), [snapshot, preview])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <cylinderGeometry args={[1.05, 1.05, 0.08, 64]} />
      <meshStandardMaterial color={col} roughness={0.55} metalness={0.05} />
    </mesh>
  )
}

function DishRim() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <torusGeometry args={[1.08, 0.04, 12, 64]} />
      <meshStandardMaterial color="#c4b49a" metalness={0.35} roughness={0.35} />
    </mesh>
  )
}

function HyphaeLines({ snapshot }: { snapshot: PetriStateSnapshot | null }) {
  const ref = useRef<THREE.LineSegments>(null)
  const geom = useMemo(() => new THREE.BufferGeometry(), [])

  useLayoutEffect(() => {
    const tips = snapshot?.tips?.filter((t) => t.alive) ?? []
    const pos: number[] = []
    for (const t of tips) {
      const [x, y, z] = toXZ(t.x, t.y)
      const len = 0.04 + Math.min(0.12, t.energy * 0.08)
      const ang = t.angle
      const dx = Math.cos(ang) * len
      const dz = Math.sin(ang) * len
      pos.push(x - dx, y, z - dz, x + dx, y, z + dz)
    }
    if (pos.length === 0) {
      pos.push(0, 0.02, 0, 0, 0.02, 0)
    }
    geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    geom.computeBoundingSphere()
    ref.current?.geometry.computeBoundingSphere()
  }, [geom, snapshot])

  return (
    <lineSegments ref={ref} geometry={geom}>
      <lineBasicMaterial color="#2d5a27" linewidth={1} transparent opacity={0.85} />
    </lineSegments>
  )
}

const MAX_ORG = 512

function classColor(o: OrganismInstance, c: THREE.Color) {
  switch (o.class) {
    case "bacteria":
      c.set("#6cb5ff")
      break
    case "virus":
      c.set("#ff6b6b")
      break
    case "host_cell":
      c.set("#ffd56b")
      break
    case "mold":
      c.set("#9b59b6")
      break
    case "mildew":
      c.set("#95a5a6")
      break
    default:
      c.set("#27ae60")
  }
}

function OrganismSpheres({ snapshot }: { snapshot: PetriStateSnapshot | null }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const organisms = snapshot?.organisms ?? []

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    let i = 0
    for (const o of organisms) {
      if (i >= MAX_ORG) break
      const [x, y, z] = toXZ(o.x, o.y)
      dummy.position.set(x, y + 0.03, z)
      const s = Math.max(0.04, o.radius * 0.04)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      classColor(o, color)
      mesh.setColorAt(i, color)
      i++
    }
    if (i === 0) {
      dummy.position.set(0, -10, 0)
      dummy.scale.setScalar(0.001)
      dummy.updateMatrix()
      mesh.setMatrixAt(0, dummy.matrix)
      mesh.setColorAt(0, color.set("#000000"))
      mesh.count = 1
    } else {
      mesh.count = i
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [organisms, color, dummy, sphereGeo])

  return (
    <instancedMesh ref={meshRef} args={[sphereGeo, undefined, MAX_ORG]}>
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[2.2, 3.5, 1.2]}
        intensity={1.25}
        castShadow
        color="#fff8e7"
      />
      <directionalLight position={[-2.5, 2.2, -1.4]} intensity={0.55} color="#b8d8ff" />
    </>
  )
}

export interface PetriViewerProps {
  snapshot: PetriStateSnapshot | null
  previewCompounds: number[]
  showStats?: boolean
}

export function PetriViewer({ snapshot, previewCompounds, showStats }: PetriViewerProps) {
  return (
    <div className="relative w-full aspect-square max-h-[min(72vh,720px)] rounded-xl border bg-black/40">
      <Canvas
        shadows
        camera={{ position: [0, 2.8, 2.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0f0c"]} />
        <Suspense fallback={null}>
          <Lights />
          <DishAgar snapshot={snapshot} preview={previewCompounds} />
          <DishRim />
          <HyphaeLines snapshot={snapshot} />
          <OrganismSpheres snapshot={snapshot} />
          <OrbitControls
            enablePan={false}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={2}
            maxDistance={5}
          />
          {showStats ? <Stats /> : null}
        </Suspense>
      </Canvas>
    </div>
  )
}
