"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import * as satellite from "satellite.js"

interface SatelliteRecord {
  name: string
  satrec: satellite.SatRec
}

const EARTH_RADIUS_KM = 6371
const DISPLAY_RADIUS = 1
const MAX_SATS = 60
const EARTH_TEXTURE =
  "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"

function OrbitScene({ satellites }: { satellites: SatelliteRecord[] }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE)

  useFrame(() => {
    if (!instancedRef.current) return
    const now = new Date()
    const gmst = satellite.gstime(now)

    satellites.forEach((sat, i) => {
      const posVel = satellite.propagate(sat.satrec, now)
      if (!posVel || typeof posVel === "boolean" || !posVel.position) return
      const positionEci = posVel.position

      const geo = satellite.eciToGeodetic(positionEci, gmst)
      const lat = geo.latitude
      const lon = geo.longitude
      const altKm = geo.height

      const altitudeFactor = Math.min(altKm, 2000) / EARTH_RADIUS_KM
      const r = DISPLAY_RADIUS + altitudeFactor * 0.6

      const x = r * Math.cos(lat) * Math.cos(lon)
      const y = r * Math.sin(lat)
      const z = r * Math.cos(lat) * Math.sin(lon)

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(0.01)
      dummy.updateMatrix()
      instancedRef.current!.setMatrixAt(i, dummy.matrix)
    })

    instancedRef.current!.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[4, 4, 4]} intensity={1.6} />
      <pointLight position={[-4, -2, 3]} intensity={0.6} />

      <mesh>
        <sphereGeometry args={[DISPLAY_RADIUS, 32, 32]} />
        <meshStandardMaterial
          map={earthTexture}
          metalness={0}
          roughness={1}
          emissive="#0b1d2a"
          emissiveIntensity={0.2}
        />
      </mesh>

      <instancedMesh
        ref={instancedRef}
        args={[undefined, undefined, satellites.length]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </instancedMesh>

      <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} />
    </>
  )
}

export default function OrbitTrackerDemo() {
  const [satellites, setSatellites] = useState<SatelliteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchSatellites = useCallback(() => {
    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (!isMounted) return
      setError("Satellite feed timed out. Showing globe only.")
      setLoading(false)
    }, 20000)

    setLoading(true)
    setError(null)
    setLastUpdated(null)

    const controller = new AbortController()
    const fetchTle = () =>
      fetch("/api/space/active-tle", { signal: controller.signal }).then((res) => {
        if (!res.ok) throw new Error("TLE fetch failed")
        return res.text()
      })

    fetchTle()
      .then((text) => {
        if (!isMounted) return
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
        const records: SatelliteRecord[] = []
        for (let i = 0; i < lines.length - 2; i += 3) {
          const name = lines[i]
          const line1 = lines[i + 1]
          const line2 = lines[i + 2]
          if (!line1 || !line2) continue
          try {
            const satrec = satellite.twoline2satrec(line1, line2)
            records.push({ name, satrec })
          } catch {
            continue
          }
          if (records.length >= MAX_SATS) break
        }
        setSatellites(records)
        if (records.length === 0) {
          setError("No satellite data returned from Celestrak.")
        } else {
          setLastUpdated(new Date().toLocaleTimeString())
        }
      })
      .catch(() => {
        if (!isMounted) return
        setSatellites([])
        setError("Failed to load satellite data. Please try again.")
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
        clearTimeout(timeoutId)
        controller.abort()
      })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  useEffect(() => fetchSatellites(), [fetchSatellites])

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh] bg-black">
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur rounded-md p-2 border border-border text-xs space-y-1">
        {loading
          ? "Loading Celestrak TLE..."
          : error
            ? error
            : `Tracking ${satellites.length} satellites`}
        <div className="text-[11px] text-muted-foreground">
          Last update: {lastUpdated ?? "—"}
        </div>
        <button
          type="button"
          onClick={fetchSatellites}
          className="mt-1 inline-flex h-7 items-center rounded border border-border bg-background/60 px-2 text-[11px] text-foreground"
        >
          Retry feed
        </button>
      </div>
      <Canvas
        camera={{ position: [2.2, 1.4, 2.2], fov: 45 }}
        dpr={[1, 1]}
        gl={{ antialias: false, powerPreference: "low-power" }}
      >
        <OrbitScene satellites={satellites} />
      </Canvas>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading satellite positions...
        </div>
      )}
      {!loading && !error && satellites.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No satellites returned from the feed.
        </div>
      )}
    </div>
  )
}
