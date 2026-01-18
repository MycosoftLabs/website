"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import * as THREE from "three";
import { GridOverlay } from "./grid-overlay";
import { LayerManager } from "./layer-manager";
import { GEEGlobe } from "./gee-globe";

interface WebGLGlobeProps {
  onCellClick?: (cellId: string, lat: number, lon: number) => void;
  onViewportChange?: (viewport: { north: number; south: number; east: number; west: number }) => void;
  layers?: {
    mycelium: boolean;
    heat: boolean;
    organisms: boolean;
    weather: boolean;
  };
}

// Globe component removed - using GEEGlobe instead

export function WebGLGlobe({ onCellClick, onViewportChange, layers }: WebGLGlobeProps) {
  const controlsRef = useRef<any>(null);
  const [zoom, setZoom] = useState(2);
  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number } | null>(null);

  useEffect(() => {
    if (onViewportChange && viewport) {
      onViewportChange(viewport);
    }
  }, [viewport, onViewportChange]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 3], fov: 50 }}
        onCreated={(state) => {
          state.gl.setClearColor("#000000", 0);
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        
        <GEEGlobe viewport={viewport || undefined} zoom={zoom} />
        <Stars radius={300} depth={50} count={5000} factor={4} fade speed={1} />
        
        <GridOverlay zoom={zoom} onCellClick={onCellClick} />
        <LayerManager zoom={zoom} viewport={viewport || undefined} layers={layers} />
        
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5} // Allow much closer zoom
          maxDistance={15} // Allow further zoom out
          zoomSpeed={1.2}
          onChange={(e) => {
            if (e?.target) {
              const cameraDistance = e.target.getDistance();
              // More granular zoom levels
              const newZoom = Math.max(1, Math.min(30, Math.round(30 - cameraDistance * 2)));
              if (newZoom !== zoom) {
                setZoom(newZoom);
              }
              
              // Calculate viewport from camera position
              if (onViewportChange) {
                const camera = e.target.object;
                const target = e.target.target;
                const camDistance = camera.position.distanceTo(target);
                const fov = camera.fov;
                const aspect = camera.aspect;
                
                // Calculate approximate viewport bounds
                const halfHeight = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * camDistance;
                const halfWidth = halfHeight * aspect;
                
                // Convert camera position to lat/lon
                const cameraPos = camera.position;
                const lat = Math.asin(cameraPos.y / camDistance) * (180 / Math.PI);
                const lon = Math.atan2(cameraPos.x, cameraPos.z) * (180 / Math.PI);
                
                // Approximate viewport (simplified calculation)
                const newViewport = {
                  north: Math.min(90, lat + halfHeight * 10),
                  south: Math.max(-90, lat - halfHeight * 10),
                  east: Math.min(180, lon + halfWidth * 10),
                  west: Math.max(-180, lon - halfWidth * 10),
                };
                setViewport(newViewport);
                onViewportChange(newViewport);
              }
            }
          }}
        />
      </Canvas>
    </div>
  );
}
