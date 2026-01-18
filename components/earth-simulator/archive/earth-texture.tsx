"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

interface EarthTextureProps {
  onTextureLoaded?: (texture: THREE.Texture) => void;
}

export function EarthTexture({ onTextureLoaded }: EarthTextureProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  useEffect(() => {
    // Use NASA Blue Marble or similar high-quality Earth texture
    // For now, using a public Earth texture URL
    // In production, this would come from Google Earth Engine
    const loadEarthTexture = async () => {
      try {
        // Try to fetch from GEE API first
        const geeResponse = await fetch("/api/earth-simulator/gee?action=satellite&north=90&south=-90&east=180&west=-180");
        const geeData = await geeResponse.json();
        
        if (geeData.success && geeData.data?.tiles?.length > 0) {
          // Use GEE tiles
          setTextureUrl(geeData.data.tiles[0]);
        } else {
          // Fallback to NASA Blue Marble
          setTextureUrl("https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg");
        }
      } catch (error) {
        console.error("Error loading Earth texture:", error);
        // Fallback to NASA Blue Marble
        setTextureUrl("https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg");
      }
    };

    loadEarthTexture();
  }, []);

  // Use texture loader when URL is available
  const texture = useTexture(
    textureUrl || "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"
  );

  useEffect(() => {
    if (texture && onTextureLoaded) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      onTextureLoaded(texture);
    }
  }, [texture, onTextureLoaded]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
