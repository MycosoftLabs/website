"use client"

import { useRef, useMemo, useState, useEffect, Suspense } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Sphere, Line, Html, Stars } from "@react-three/drei"
import * as THREE from "three"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Layers, RefreshCw, Loader2, MapPin, Globe, Activity, Zap, ZoomIn, ZoomOut } from "lucide-react"

interface GlobeDataPoint {
  id: string
  name: string
  lat: number
  lng: number
  value: number
  type: "observation" | "device" | "spore"
  color?: string
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Globe Earth component
function Earth({ dataPoints, showConnections }: { dataPoints: GlobeDataPoint[], showConnections: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.getElapsedTime() * 0.02
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = clock.getElapsedTime() * 0.025
    }
  })

  // Create grid lines for the globe
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = []
    
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const points: THREE.Vector3[] = []
      for (let lng = -180; lng <= 180; lng += 5) {
        points.push(latLngToVector3(lat, lng, 1.01))
      }
      lines.push(
        <Line
          key={`lat-${lat}`}
          points={points}
          color="#22c55e"
          lineWidth={0.5}
          opacity={0.3}
          transparent
        />
      )
    }
    
    // Longitude lines
    for (let lng = -180; lng < 180; lng += 30) {
      const points: THREE.Vector3[] = []
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(latLngToVector3(lat, lng, 1.01))
      }
      lines.push(
        <Line
          key={`lng-${lng}`}
          points={points}
          color="#22c55e"
          lineWidth={0.5}
          opacity={0.3}
          transparent
        />
      )
    }
    
    return lines
  }, [])

  // Create connection lines between data points
  const connections = useMemo(() => {
    if (!showConnections || dataPoints.length < 2) return null
    
    const lines: JSX.Element[] = []
    const nearbyThreshold = 30 // degrees
    
    for (let i = 0; i < Math.min(dataPoints.length, 50); i++) {
      for (let j = i + 1; j < Math.min(dataPoints.length, 50); j++) {
        const p1 = dataPoints[i]
        const p2 = dataPoints[j]
        const dist = Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2))
        
        if (dist < nearbyThreshold) {
          const start = latLngToVector3(p1.lat, p1.lng, 1.02)
          const end = latLngToVector3(p2.lat, p2.lng, 1.02)
          const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.1)
          
          lines.push(
            <Line
              key={`conn-${i}-${j}`}
              points={[start, mid, end]}
              color="#4ade80"
              lineWidth={1}
              opacity={0.4}
              transparent
            />
          )
        }
      }
    }
    
    return lines
  }, [dataPoints, showConnections])

  return (
    <group>
      {/* Earth sphere */}
      <Sphere ref={earthRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#0f172a"
          emissive="#16a34a"
          emissiveIntensity={0.05}
          roughness={0.8}
          metalness={0.1}
        />
      </Sphere>
      
      {/* Grid lines */}
      {gridLines}
      
      {/* Connections */}
      {connections}
      
      {/* Glow effect */}
      <Sphere ref={glowRef} args={[1.02, 32, 32]}>
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  )
}

// Data point markers
function DataPointMarkers({ dataPoints, onSelect }: { dataPoints: GlobeDataPoint[], onSelect: (p: GlobeDataPoint) => void }) {
  return (
    <group>
      {dataPoints.slice(0, 100).map((point) => {
        const position = latLngToVector3(point.lat, point.lng, 1.02)
        const color = point.color || (
          point.type === "observation" ? "#22c55e" :
          point.type === "device" ? "#3b82f6" :
          "#f97316"
        )
        
        return (
          <group key={point.id} position={position}>
            <mesh onClick={() => onSelect(point)}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Pulse effect */}
            <mesh>
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// Camera controller
function CameraController({ zoom }: { zoom: number }) {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.z = 3 - (zoom * 0.5)
  }, [zoom, camera])
  
  return null
}

// Main component
export function GlobeVisualization() {
  const [dataPoints, setDataPoints] = useState<GlobeDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showConnections, setShowConnections] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<GlobeDataPoint | null>(null)
  const [zoom, setZoom] = useState(0)
  const [stats, setStats] = useState({ total: 0, devices: 0, observations: 0, spores: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/mindex/observations?limit=200")
      const data = await res.json()
      
      const points: GlobeDataPoint[] = (data.observations || []).map((o: any) => ({
        id: o.id,
        name: o.species,
        lat: o.lat,
        lng: o.lng,
        value: 1,
        type: "observation" as const,
      }))

      // Add some simulated devices
      const devices: GlobeDataPoint[] = [
        { id: "dev-1", name: "MycoBrain Alpha", lat: 37.7749, lng: -122.4194, value: 100, type: "device" },
        { id: "dev-2", name: "MycoBrain Beta", lat: 40.7128, lng: -74.0060, value: 85, type: "device" },
        { id: "dev-3", name: "SporeBase HQ", lat: 51.5074, lng: -0.1278, value: 92, type: "device" },
        { id: "dev-4", name: "MycoBrain Tokyo", lat: 35.6762, lng: 139.6503, value: 78, type: "device" },
        { id: "dev-5", name: "MycoBrain Sydney", lat: -33.8688, lng: 151.2093, value: 88, type: "device" },
      ]

      const allPoints = [...points, ...devices]
      setDataPoints(allPoints)
      
      setStats({
        total: allPoints.length,
        devices: devices.length,
        observations: points.length,
        spores: 0,
      })
    } catch (err) {
      console.error("Failed to fetch data:", err)
    }
    setIsLoading(false)
  }

  return (
    <div className="relative h-full w-full min-h-[600px] bg-slate-950 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <CameraController zoom={zoom} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22c55e" />
        
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
          <Earth dataPoints={dataPoints} showConnections={showConnections} />
          <DataPointMarkers dataPoints={dataPoints} onSelect={setSelectedPoint} />
        </Suspense>
        
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={5}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-500" />
            <p>Loading Global Network...</p>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" className="bg-green-500/20 text-green-400 mb-2">
          <Globe className="h-3 w-3 mr-1" />
          3D Globe View
        </Badge>
        <h3 className="text-lg font-bold text-white">Global Mycelium Network</h3>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-16 flex gap-2 z-10">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur">
          <Activity className="h-3 w-3 mr-1" />
          {stats.total} Points
        </Badge>
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
          {stats.devices} Devices
        </Badge>
        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
          {stats.observations} Observations
        </Badge>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur" onClick={() => setShowFilters(!showFilters)}>
          <Layers className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur" onClick={() => setZoom(Math.min(zoom + 1, 3))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur" onClick={() => setZoom(Math.max(zoom - 1, -1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="absolute top-16 right-4 w-64 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Display Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3" /> Network Connections
              </Label>
              <Switch checked={showConnections} onCheckedChange={setShowConnections} />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Legend:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs">Observations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs">Devices</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-xs">Spore Detectors</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Point */}
      {selectedPoint && (
        <Card className="absolute bottom-4 left-4 w-72 bg-background/95 backdrop-blur z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-500" />
                {selectedPoint.name}
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedPoint(null)}>×</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="capitalize text-muted-foreground">Type: {selectedPoint.type}</p>
            <p>Location: {selectedPoint.lat.toFixed(2)}, {selectedPoint.lng.toFixed(2)}</p>
            <Button variant="outline" size="sm" className="w-full mt-2">
              View Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Badge variant="outline" className="bg-background/60 backdrop-blur text-xs">
          Drag to rotate • Scroll to zoom • Click points for details
        </Badge>
      </div>
    </div>
  )
}
