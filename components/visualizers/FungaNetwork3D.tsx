"use client"

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

interface FungaNetwork3DProps {
  status: "live" | "degraded" | "loading";
  loss?: number;
}

const Node = ({ position, color, glow, noiseOffset }: { position: [number,number,number], color: string, glow: boolean, noiseOffset: number }) => {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.MeshStandardMaterial>(null)
    
    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(clock.elapsedTime + noiseOffset) * 0.1
        }
        if (glow && materialRef.current) {
            // Pulse the emissive intensity based on "live" state
            const intensity = 1.5 + Math.sin(clock.elapsedTime * 4 + noiseOffset * 2) * 1.0
            materialRef.current.emissiveIntensity = intensity
        }
    })
    
    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial 
                ref={materialRef}
                color={color} 
                emissive={color} 
                emissiveIntensity={glow ? 1.5 : 0.2} 
                toneMapped={false}
            />
        </mesh>
    )
}

const Connection = ({ start, end, status, index }: { start: [number,number,number], end: [number,number,number], status: "live" | "degraded" | "loading", index: number }) => {
    const isLive = status === 'live'
    const color = isLive ? '#2dd4bf' : '#334155'
    const ref = useRef<any>(null)
    
    useFrame(({ clock }) => {
        if (isLive && ref.current?.material) {
            ref.current.material.opacity = 0.2 + Math.abs(Math.sin(clock.elapsedTime * 2 + index * 0.1)) * 0.3
        }
    })

    return (
        <Line 
            ref={ref}
            points={[start, end]} 
            color={color} 
            lineWidth={isLive ? 1.5 : 0.5} 
            transparent 
            opacity={isLive ? 0.4 : 0.1} 
        />
    )
}

const NetworkArchitecture = ({ status }: { status: "live" | "degraded" | "loading" }) => {
    // Generate Fixed Network Coordinates
    const inputNodes = useMemo(() => Array.from({length: 4}, (_, i) => [-4, 3 - i * 2, 0] as [number,number,number]), [])
    const hiddenNodes = useMemo(() => Array.from({length: 5}, (_, i) => [0, 4 - i * 2, 0] as [number,number,number]), [])
    const outputNodes = useMemo(() => Array.from({length: 3}, (_, i) => [4, 2 - i * 2, 0] as [number,number,number]), [])

    const isLive = status === 'live'

    return (
        <group>
            {/* IN -> HIDDEN Connections */}
            {inputNodes.map((start, i) => 
                hiddenNodes.map((end, j) => (
                    <Connection key={`in-hid-${i}-${j}`} start={start} end={end} status={status} index={i+j} />
                ))
            )}
            
            {/* HIDDEN -> OUT Connections */}
            {hiddenNodes.map((start, i) => 
                outputNodes.map((end, j) => (
                    <Connection key={`hid-out-${i}-${j}`} start={start} end={end} status={status} index={i+j+10} />
                ))
            )}

            {/* Render Nodes */}
            {inputNodes.map((pos, i) => (
                <Node key={`in-${i}`} position={pos} color="#22c55e" glow={isLive} noiseOffset={i} />
            ))}
            {hiddenNodes.map((pos, i) => (
                <Node key={`hid-${i}`} position={pos} color="#a855f7" glow={isLive} noiseOffset={i + 10} />
            ))}
            {outputNodes.map((pos, i) => (
                <Node key={`out-${i}`} position={pos} color="#2dd4bf" glow={isLive} noiseOffset={i + 20} />
            ))}
        </group>
    )
}

export default function FungaNetwork3D({ status, loss = 4.0 }: FungaNetwork3DProps) {
    const isLive = status === 'live'
    
    return (
        <div className="w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative cursor-move">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                <color attach="background" args={['#020617']} />
                
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
                
                <NetworkArchitecture status={status} />
                
                {/* Visual Camera Controls */}
                <OrbitControls 
                    enableZoom={false} 
                    autoRotate={isLive} 
                    autoRotateSpeed={isLive ? (Math.max(0.5, 4.0 / (loss || 1))) : 0} 
                    maxPolarAngle={Math.PI / 1.5}
                    minPolarAngle={Math.PI / 3}
                />
                
                {/* Glow Post-processing */}
                <EffectComposer enabled={isLive}>
                  <Bloom 
                    luminanceThreshold={0.2} 
                    luminanceSmoothing={0.9} 
                    intensity={2.0} 
                    mipmapBlur 
                  />
                </EffectComposer>
            </Canvas>
            
            {/* Overlays */}
            <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1">
                <div className="text-xs font-mono text-slate-400">Input Signals</div>
                <div className="text-xs font-mono text-green-500">Bio-Electrical</div>
            </div>
            <div className="absolute top-4 right-4 pointer-events-none flex flex-col gap-1 items-end">
                <div className="text-xs font-mono text-slate-400">Output Layer</div>
                <div className="text-xs font-mono text-teal-400">FungaLex Tokens</div>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="text-xs font-mono text-purple-400 opacity-60">NLM Transformer Self-Attention ({isLive ? 'Active' : 'Offline'})</div>
            </div>
            
            {status !== 'live' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm z-20 pointer-events-none">
                    <p className="text-slate-300 flex items-center gap-2 font-mono">
                        [ NLM Live Stream Offline ]
                    </p>
                </div>
            )}
        </div>
    )
}
