'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import * as THREE from 'three'

interface Atom {
  id: number
  element: string
  x: number
  y: number
  z: number
  residue: string
  chain: string
}

interface Bond {
  from: number
  to: number
}

interface ProteinData {
  name: string
  atoms: Atom[]
  bonds: Bond[]
  sequence?: string
}

// Atom colors by element
const ELEMENT_COLORS: Record<string, string> = {
  C: '#909090',
  N: '#3050F8',
  O: '#FF0D0D',
  S: '#FFFF30',
  H: '#FFFFFF',
  P: '#FF8000',
  FE: '#E06633',
  MG: '#8AFF00',
  CA: '#3DFF00',
  ZN: '#7D80B0',
  DEFAULT: '#FF1493',
}

const ELEMENT_RADII: Record<string, number> = {
  C: 0.77,
  N: 0.75,
  O: 0.73,
  S: 1.02,
  H: 0.37,
  P: 1.06,
  DEFAULT: 0.8,
}

// Single Atom component
function AtomSphere({ atom, scale = 1 }: { atom: Atom; scale?: number }) {
  const color = ELEMENT_COLORS[atom.element] || ELEMENT_COLORS.DEFAULT
  const radius = (ELEMENT_RADII[atom.element] || ELEMENT_RADII.DEFAULT) * scale

  return (
    <mesh position={[atom.x, atom.y, atom.z]}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
    </mesh>
  )
}

// Bond cylinder component
function BondCylinder({ from, to }: { from: Atom; to: Atom }) {
  const start = new THREE.Vector3(from.x, from.y, from.z)
  const end = new THREE.Vector3(to.x, to.y, to.z)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const length = start.distanceTo(end)
  const direction = new THREE.Vector3().subVectors(end, start).normalize()

  const ref = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.lookAt(end)
      ref.current.rotateX(Math.PI / 2)
    }
  }, [end])

  return (
    <mesh ref={ref} position={mid}>
      <cylinderGeometry args={[0.15, 0.15, length, 8]} />
      <meshStandardMaterial color="#666666" metalness={0.2} roughness={0.8} />
    </mesh>
  )
}

// Protein molecule component
function ProteinMolecule({ protein, viewMode }: { protein: ProteinData; viewMode: string }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation
      groupRef.current.rotation.y += 0.002
    }
  })

  const atomScale = viewMode === 'spacefill' ? 1.5 : viewMode === 'ball-stick' ? 0.5 : 0.3

  return (
    <group ref={groupRef}>
      {/* Atoms */}
      {protein.atoms.map((atom) => (
        <AtomSphere key={atom.id} atom={atom} scale={atomScale} />
      ))}

      {/* Bonds */}
      {viewMode !== 'spacefill' && protein.bonds.map((bond, i) => {
        const fromAtom = protein.atoms.find(a => a.id === bond.from)
        const toAtom = protein.atoms.find(a => a.id === bond.to)
        if (!fromAtom || !toAtom) return null
        return <BondCylinder key={i} from={fromAtom} to={toAtom} />
      })}
    </group>
  )
}

// Loading placeholder
function LoadingProtein() {
  return (
    <Html center>
      <div className="flex items-center gap-2 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading structure...
      </div>
    </Html>
  )
}

// Generate sample protein data
function generateSampleProtein(): ProteinData {
  const atoms: Atom[] = []
  const bonds: Bond[] = []
  let id = 0

  // Generate a simple helix structure
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 6
    const radius = 5
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = i * 0.8 - 20

    // Backbone atoms
    atoms.push({
      id: id++,
      element: 'C',
      x,
      y,
      z,
      residue: `ALA${i}`,
      chain: 'A',
    })

    atoms.push({
      id: id++,
      element: 'N',
      x: x + 1,
      y: y + 0.3,
      z: z + 0.5,
      residue: `ALA${i}`,
      chain: 'A',
    })

    atoms.push({
      id: id++,
      element: 'O',
      x: x - 0.5,
      y: y - 0.3,
      z: z + 1,
      residue: `ALA${i}`,
      chain: 'A',
    })

    // Bonds within residue
    if (i > 0) {
      bonds.push({ from: (i - 1) * 3, to: i * 3 })
    }
    bonds.push({ from: i * 3, to: i * 3 + 1 })
    bonds.push({ from: i * 3, to: i * 3 + 2 })
  }

  return {
    name: 'Sample Alpha Helix',
    atoms,
    bonds,
    sequence: 'MNIFEMLRIDEGLRLKIYKDTEGYYTIGIGHLLTKSPSLNAAKSELDKAIGRNTNGVITKDEAEKLFNQ',
  }
}

export function ProteinStructureViewer() {
  const [protein, setProtein] = useState<ProteinData | null>(null)
  const [viewMode, setViewMode] = useState<string>('ball-stick')
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    // Load sample protein
    setTimeout(() => {
      setProtein(generateSampleProtein())
      setIsLoading(false)
    }, 1000)
  }, [])

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Protein Structure Viewer</CardTitle>
          {protein && <Badge variant="outline">{protein.atoms.length} atoms</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wireframe">Wireframe</SelectItem>
              <SelectItem value="ball-stick">Ball & Stick</SelectItem>
              <SelectItem value="spacefill">Spacefill</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`bg-gray-900 rounded-b-lg ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-96'}`}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 50]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            <Suspense fallback={<LoadingProtein />}>
              {protein && <ProteinMolecule protein={protein} viewMode={viewMode} />}
            </Suspense>
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  )
}
