'use client'

import { useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Line } from '@react-three/drei'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, RotateCcw, Maximize2, Loader2 } from 'lucide-react'
import * as THREE from 'three'

interface NetworkNode {
  id: string
  position: [number, number, number]
  signal: number
  type: 'hub' | 'junction' | 'tip'
  age: number
}

interface NetworkEdge {
  from: string
  to: string
  strength: number
}

interface MyceliumNetwork {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

// Node component
function NetworkNodeMesh({ node, onClick }: { node: NetworkNode; onClick?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Pulse effect based on signal
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + node.signal) * 0.1
      meshRef.current.scale.setScalar(scale)
    }
  })

  const size = node.type === 'hub' ? 0.4 : node.type === 'junction' ? 0.25 : 0.15
  const color = new THREE.Color()
  color.setHSL(0.3 - node.signal * 0.3, 0.8, 0.5) // Green to red based on signal

  return (
    <mesh ref={meshRef} position={node.position} onClick={onClick}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial 
        color={color}
        emissive={color}
        emissiveIntensity={node.signal * 0.5}
        metalness={0.3}
        roughness={0.6}
      />
    </mesh>
  )
}

// Edge component using Line
function NetworkEdgeLine({ from, to, strength }: { from: [number, number, number]; to: [number, number, number]; strength: number }) {
  const points = useMemo(() => [
    new THREE.Vector3(...from),
    new THREE.Vector3(...to),
  ], [from, to])

  return (
    <Line
      points={points}
      color={`hsl(${120 - strength * 120}, 70%, 50%)`}
      lineWidth={strength * 2 + 0.5}
      transparent
      opacity={0.6}
    />
  )
}

// Growing effect particles
function GrowthParticles() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 100

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#88ff88" transparent opacity={0.5} />
    </points>
  )
}

// Generate sample network
function generateNetwork(nodeCount: number): MyceliumNetwork {
  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []

  // Create hub nodes
  for (let i = 0; i < 3; i++) {
    nodes.push({
      id: `hub-${i}`,
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ],
      signal: Math.random() * 0.5 + 0.5,
      type: 'hub',
      age: 100,
    })
  }

  // Create junction and tip nodes
  for (let i = 0; i < nodeCount - 3; i++) {
    const parentNode = nodes[Math.floor(Math.random() * nodes.length)]
    const offset: [number, number, number] = [
      parentNode.position[0] + (Math.random() - 0.5) * 4,
      parentNode.position[1] + (Math.random() - 0.5) * 4,
      parentNode.position[2] + (Math.random() - 0.5) * 4,
    ]

    const node: NetworkNode = {
      id: `node-${i}`,
      position: offset,
      signal: Math.random(),
      type: Math.random() > 0.7 ? 'junction' : 'tip',
      age: i,
    }
    nodes.push(node)

    // Connect to parent
    edges.push({
      from: parentNode.id,
      to: node.id,
      strength: Math.random(),
    })

    // Random connections to nearby nodes
    if (Math.random() > 0.7 && i > 5) {
      const nearbyNode = nodes[Math.floor(Math.random() * (nodes.length - 1))]
      if (nearbyNode.id !== node.id) {
        edges.push({
          from: node.id,
          to: nearbyNode.id,
          strength: Math.random() * 0.5,
        })
      }
    }
  }

  return { nodes, edges }
}

// Main scene
function MyceliumScene({ network, isPlaying }: { network: MyceliumNetwork; isPlaying: boolean }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current && isPlaying) {
      groupRef.current.rotation.y += 0.002
    }
  })

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {network.edges.map((edge, i) => {
        const fromNode = network.nodes.find(n => n.id === edge.from)
        const toNode = network.nodes.find(n => n.id === edge.to)
        if (!fromNode || !toNode) return null
        return (
          <NetworkEdgeLine
            key={i}
            from={fromNode.position}
            to={toNode.position}
            strength={edge.strength}
          />
        )
      })}

      {/* Nodes */}
      {network.nodes.map((node) => (
        <NetworkNodeMesh key={node.id} node={node} />
      ))}

      <GrowthParticles />
    </group>
  )
}

export function Mycelium3DNetwork() {
  const [network, setNetwork] = useState<MyceliumNetwork | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [nodeCount, setNodeCount] = useState([50])
  const [isFullscreen, setIsFullscreen] = useState(false)

  useMemo(() => {
    setNetwork(generateNetwork(nodeCount[0]))
  }, [nodeCount])

  const regenerate = () => {
    setNetwork(generateNetwork(nodeCount[0]))
  }

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">3D Mycelium Network</CardTitle>
          {network && (
            <>
              <Badge variant="outline">{network.nodes.length} nodes</Badge>
              <Badge variant="outline">{network.edges.length} edges</Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-xs text-muted-foreground">Complexity:</span>
            <Slider
              value={nodeCount}
              onValueChange={setNodeCount}
              min={20}
              max={200}
              step={10}
              className="w-24"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={regenerate}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(!isFullscreen)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`bg-gray-900 rounded-b-lg ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-96'}`}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 25]} />
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#88ff88" />
            <Suspense fallback={<Html center><Loader2 className="animate-spin text-white" /></Html>}>
              {network && <MyceliumScene network={network} isPlaying={isPlaying} />}
            </Suspense>
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  )
}
