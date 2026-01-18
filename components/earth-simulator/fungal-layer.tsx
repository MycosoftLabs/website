"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface FungalObservation {
  id: string;
  species: string;
  scientificName: string;
  lat: number;
  lng: number;
  timestamp: string;
  source: string;
  verified: boolean;
  observer: string;
  imageUrl: string;
}

interface FungalLayerProps {
  zoom: number;
  viewport?: { north: number; south: number; east: number; west: number };
  showHeatmap?: boolean;
  showMarkers?: boolean;
}

// Convert lat/lng to 3D sphere coordinates
function latLngToVector3(lat: number, lng: number, radius: number = 1.005): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

export function FungalLayer({ 
  zoom, 
  viewport, 
  showHeatmap = true, 
  showMarkers = true 
}: FungalLayerProps) {
  const [observations, setObservations] = useState<FungalObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const pointsRef = useRef<THREE.Points>(null);
  const heatmapRef = useRef<THREE.Mesh>(null);
  
  // Fetch fungal data from the dedicated API route
  useEffect(() => {
    async function fetchFungalData() {
      try {
        const response = await fetch("/api/earth/fungal?limit=500");
        if (response.ok) {
          const data = await response.json();
          setObservations(data.observations || []);
        }
      } catch (error) {
        console.error("Failed to fetch fungal data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchFungalData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchFungalData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Create point geometry for fungal markers
  const { positions, colors, sizes } = useMemo(() => {
    const validObs = observations.filter(
      (obs) => obs.lat !== 0 && obs.lng !== 0 && !isNaN(obs.lat) && !isNaN(obs.lng)
    );
    
    const positions = new Float32Array(validObs.length * 3);
    const colors = new Float32Array(validObs.length * 3);
    const sizes = new Float32Array(validObs.length);
    
    validObs.forEach((obs, i) => {
      const pos = latLngToVector3(obs.lat, obs.lng);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      
      // Color based on source - MINDEX is brighter green
      if (obs.source === "MINDEX") {
        colors[i * 3] = 0.133;     // R
        colors[i * 3 + 1] = 0.773; // G - Bright green
        colors[i * 3 + 2] = 0.369; // B
        sizes[i] = obs.verified ? 0.012 : 0.008;
      } else if (obs.source === "iNaturalist") {
        colors[i * 3] = 0.063;
        colors[i * 3 + 1] = 0.722;
        colors[i * 3 + 2] = 0.506;
        sizes[i] = obs.verified ? 0.010 : 0.006;
      } else { // GBIF
        colors[i * 3] = 0.529;
        colors[i * 3 + 1] = 0.808;
        colors[i * 3 + 2] = 0.922;
        sizes[i] = 0.005;
      }
    });
    
    return { positions, colors, sizes };
  }, [observations]);

  // Animate points
  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      // Subtle pulsing effect
      pointsRef.current.material.opacity = 0.7 + Math.sin(time * 2) * 0.2;
    }
  });

  if (loading || observations.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Fungal observation points */}
      {showMarkers && positions.length > 0 && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={positions.length / 3}
              array={positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={colors.length / 3}
              array={colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.015}
            vertexColors
            transparent
            opacity={0.9}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
      
      {/* Heatmap overlay for density visualization */}
      {showHeatmap && (
        <mesh ref={heatmapRef} rotation={[0, 0, 0]}>
          <sphereGeometry args={[1.002, 64, 64]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
