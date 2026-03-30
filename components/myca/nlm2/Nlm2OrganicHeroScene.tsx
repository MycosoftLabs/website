"use client"

import { useRef, useMemo, Suspense, useEffect, useState, useLayoutEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])
  return reduced
}

function HyphaTube({
  points,
  color,
  radius,
}: {
  points: THREE.Vector3[]
  color: string
  radius: number
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])
  return (
    <mesh>
      <tubeGeometry args={[curve, 28, radius, 5, false]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.22}
        roughness={0.42}
        metalness={0.38}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

function HyphalBundle() {
  const groupRef = useRef<THREE.Group>(null)
  const curvePoints = useMemo(() => {
    const list: THREE.Vector3[][] = []
    for (let b = 0; b < 8; b++) {
      const pts: THREE.Vector3[] = []
      const startX = (b / 8 - 0.5) * 6.5
      for (let i = 0; i < 9; i++) {
        const t = i / 8
        pts.push(
          new THREE.Vector3(
            startX + Math.sin(t * 4.2 + b * 0.7) * 0.95,
            -2.6 + t * 5.2,
            Math.cos(t * 3.1 + b * 1.1) * 0.75
          )
        )
      }
      list.push(pts)
    }
    return list
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.055
    }
  })

  const colors = ["#2dd4bf", "#4ade80", "#34d399", "#86efac", "#5eead4"]

  return (
    <group ref={groupRef}>
      {curvePoints.map((pts, i) => (
        <HyphaTube
          key={i}
          points={pts}
          color={colors[i % colors.length]}
          radius={0.028 + (i % 4) * 0.012}
        />
      ))}
    </group>
  )
}

function SporeField({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const temp = useMemo(() => new THREE.Object3D(), [])
  const { positions, phases } = useMemo(() => {
    const positions: number[] = []
    const phases: number[] = []
    for (let i = 0; i < count; i++) {
      positions.push(
        (Math.random() - 0.5) * 7.5,
        (Math.random() - 0.5) * 6.2,
        (Math.random() - 0.5) * 4.2
      )
      phases.push(Math.random() * Math.PI * 2)
    }
    return { positions, phases }
  }, [count])

  useLayoutEffect(() => {
    const m = meshRef.current
    if (!m) return
    for (let i = 0; i < count; i++) {
      temp.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      temp.scale.setScalar(0.038 + (i % 5) * 0.016)
      temp.updateMatrix()
      m.setMatrixAt(i, temp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [count, positions, temp])

  useFrame((state) => {
    const m = meshRef.current
    if (!m) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3]
      const y = positions[i * 3 + 1]
      const z = positions[i * 3 + 2]
      const ph = phases[i]
      temp.position.set(
        x + Math.sin(t * 0.38 + ph) * 0.14,
        y + Math.sin(t * 0.55 + ph * 2) * 0.11,
        z + Math.cos(t * 0.33 + ph) * 0.09
      )
      temp.scale.setScalar(0.038 + (i % 5) * 0.016)
      temp.updateMatrix()
      m.setMatrixAt(i, temp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ecfccb"
        emissive="#a3e635"
        emissiveIntensity={0.35}
        roughness={0.25}
        metalness={0.55}
      />
    </instancedMesh>
  )
}

function RootVeins() {
  return (
    <group position={[0, -2.45, 0]}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[(i - 2.5) * 0.95, -0.2, (i % 2) * 0.15 - 0.08]}
          rotation={[0.35 + i * 0.04, 0, (i - 2.5) * 0.12]}
        >
          <cylinderGeometry args={[0.05, 0.13, 1.6, 8]} />
          <meshStandardMaterial
            color="#3f6212"
            emissive="#365314"
            emissiveIntensity={0.06}
            roughness={0.82}
            metalness={0.12}
          />
        </mesh>
      ))}
    </group>
  )
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.32} />
      <pointLight position={[4.5, 3.5, 6]} intensity={22} color="#5eead4" distance={22} decay={2} />
      <pointLight position={[-5, -1.5, 3]} intensity={10} color="#bef264" distance={16} decay={2} />
      <directionalLight position={[2, 9, 5]} intensity={0.55} color="#fef9c3" />
      <fog attach="fog" args={["#050807", 3.8, 13.5]} />
      <HyphalBundle />
      <SporeField count={56} />
      <RootVeins />
    </>
  )
}

/** 3D substrate: hyphae, spores, root forms — decorative only. */
export function Nlm2OrganicHeroScene() {
  const reduced = usePrefersReducedMotion()

  if (reduced) {
    return (
      <div
        className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-teal-900/45 bg-gradient-to-br from-[#0a1512] via-[#0c1a16] to-[#050807] shadow-[0_24px_80px_-12px_rgba(45,211,191,0.12)] md:h-[320px]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_65%_25%,rgba(45,212,191,0.14),transparent_55%)]" />
        <svg className="absolute inset-x-0 bottom-0 h-4/5 w-full opacity-50" viewBox="0 0 480 220" fill="none">
          <path
            d="M240 220 Q180 130 120 70 M240 220 Q300 130 360 70 M240 220 Q235 100 240 40"
            stroke="currentColor"
            className="text-teal-500/40"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-teal-700/25 bg-[#030504] shadow-[0_28px_90px_-14px_rgba(20,184,166,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] md:h-[340px]"
      aria-hidden
    >
      <Canvas
        className="absolute inset-0 h-full w-full"
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 7.8], fov: 40 }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[#070c0a]/80 via-transparent to-teal-950/20" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.07]" />
    </div>
  )
}
