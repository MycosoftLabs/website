'use client'

import { useRef, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Text, Box, Cylinder } from '@react-three/drei'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Maximize2, Loader2, Eye, EyeOff } from 'lucide-react'
import * as THREE from 'three'

interface LabInstrument {
  id: string
  name: string
  type: 'incubator' | 'bioreactor' | 'microscope' | 'fci' | 'storage' | 'workbench'
  position: [number, number, number]
  status: 'online' | 'offline' | 'busy'
  size: [number, number, number]
}

// Instrument 3D model
function Instrument({ instrument, showLabels }: { instrument: LabInstrument; showLabels: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const colors = {
    incubator: '#3b82f6',
    bioreactor: '#22c55e',
    microscope: '#a855f7',
    fci: '#eab308',
    storage: '#6b7280',
    workbench: '#78716c',
  }

  const statusColors = {
    online: '#22c55e',
    offline: '#6b7280',
    busy: '#3b82f6',
  }

  useFrame(() => {
    if (meshRef.current && instrument.status === 'busy') {
      meshRef.current.rotation.y += 0.01
    }
  })

  return (
    <group position={instrument.position}>
      <Box
        ref={meshRef}
        args={instrument.size}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={colors[instrument.type]}
          metalness={0.4}
          roughness={0.6}
          emissive={hovered ? colors[instrument.type] : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </Box>

      {/* Status indicator */}
      <mesh position={[0, instrument.size[1] / 2 + 0.2, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={statusColors[instrument.status]}
          emissive={statusColors[instrument.status]}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Label */}
      {(showLabels || hovered) && (
        <Html position={[0, instrument.size[1] / 2 + 0.5, 0]} center distanceFactor={10}>
          <div className="bg-black/80 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
            <div className="font-bold">{instrument.name}</div>
            <div className="text-gray-400 capitalize">{instrument.status}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

// Floor grid
function LabFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.9} />
      </mesh>
      <gridHelper args={[20, 20, '#333', '#222']} />
    </group>
  )
}

// Walls
function LabWalls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 2, -10]}>
        <planeGeometry args={[20, 4]} />
        <meshStandardMaterial color="#16213e" side={THREE.DoubleSide} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 4]} />
        <meshStandardMaterial color="#1a1a2e" side={THREE.DoubleSide} />
      </mesh>
      {/* Right wall */}
      <mesh position={[10, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 4]} />
        <meshStandardMaterial color="#1a1a2e" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Sample lab layout
const LAB_INSTRUMENTS: LabInstrument[] = [
  { id: 'inc-1', name: 'Incubator-01', type: 'incubator', position: [-7, 1, -7], size: [2, 2, 1.5], status: 'online' },
  { id: 'inc-2', name: 'Incubator-02', type: 'incubator', position: [-7, 1, -4], size: [2, 2, 1.5], status: 'online' },
  { id: 'bio-1', name: 'Bioreactor-A', type: 'bioreactor', position: [-3, 1.5, -7], size: [1.5, 3, 1.5], status: 'busy' },
  { id: 'bio-2', name: 'Bioreactor-B', type: 'bioreactor', position: [-1, 1.5, -7], size: [1.5, 3, 1.5], status: 'online' },
  { id: 'mic-1', name: 'Microscope-HD', type: 'microscope', position: [4, 0.75, -6], size: [1, 1.5, 1], status: 'online' },
  { id: 'fci-1', name: 'Petraeus FCI', type: 'fci', position: [7, 0.5, -7], size: [1.5, 1, 1.5], status: 'busy' },
  { id: 'store-1', name: 'Cold Storage', type: 'storage', position: [8, 1.5, 0], size: [1.5, 3, 2], status: 'online' },
  { id: 'store-2', name: 'Spore Bank', type: 'storage', position: [8, 1.5, 4], size: [1.5, 3, 2], status: 'online' },
  { id: 'bench-1', name: 'Workbench A', type: 'workbench', position: [0, 0.5, 0], size: [4, 1, 2], status: 'online' },
  { id: 'bench-2', name: 'Workbench B', type: 'workbench', position: [0, 0.5, 5], size: [4, 1, 2], status: 'online' },
]

// Lab scene
function LabScene({ showLabels }: { showLabels: boolean }) {
  return (
    <group>
      <LabFloor />
      <LabWalls />
      {LAB_INSTRUMENTS.map((instrument) => (
        <Instrument key={instrument.id} instrument={instrument} showLabels={showLabels} />
      ))}
    </group>
  )
}

export function LabDigitalTwin() {
  const [showLabels, setShowLabels] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const onlineCount = LAB_INSTRUMENTS.filter(i => i.status === 'online').length
  const busyCount = LAB_INSTRUMENTS.filter(i => i.status === 'busy').length

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Lab Digital Twin</CardTitle>
          <Badge variant="outline" className="text-green-500">{onlineCount} Online</Badge>
          <Badge variant="outline" className="text-blue-500">{busyCount} Busy</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowLabels(!showLabels)}>
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`bg-gray-900 rounded-b-lg ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-96'}`}>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[15, 10, 15]} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} intensity={0.5} color="#88aaff" />
            <Suspense fallback={<Html center><Loader2 className="animate-spin text-white" /></Html>}>
              <LabScene showLabels={showLabels} />
            </Suspense>
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              maxPolarAngle={Math.PI / 2.1}
              minDistance={5}
              maxDistance={30}
            />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  )
}
