"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Text, Html } from "@react-three/drei"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"

const FungalNode = ({ name, level, x, y, z }: { name: string; level: number; x: number; y: number; z: number }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color={level === 0 ? "red" : level === 1 ? "orange" : "yellow"} />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Geist-Regular.ttf"
      >
        {name}
      </Text>
      {isExpanded && level < 2 && (
        <>
          <FungalNode name={`${name}-child1`} level={level + 1} x={x + 1} y={y - 1} z={z} />
          <FungalNode name={`${name}-child2`} level={level + 1} x={x - 1} y={y - 1} z={z} />
        </>
      )}
      <Html distanceFactor={5} transform occlude>
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? "Collapse" : "Expand"}
        </Button>
      </Html>
    </group>
  )
}


export default function FungalAncestryPage() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <FungalNode name="Fungi" level={0} x={0} y={0} z={0} />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
