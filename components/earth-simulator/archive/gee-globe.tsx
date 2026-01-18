"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geeClient } from "@/lib/earth-simulator/gee-client";

interface GEEGlobeProps {
  viewport?: { north: number; south: number; east: number; west: number };
  zoom: number;
  onTextureUpdate?: (texture: THREE.Texture) => void;
}

export function GEEGlobe({ viewport, zoom, onTextureUpdate }: GEEGlobeProps) {
  const globeRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate zoom level for tile requests
  // Google Maps uses zoom 0-20, we'll map our zoom (1-30) to that range
  const tileZoom = useMemo(() => {
    // Map our zoom to Google Maps zoom (0-20)
    // At zoom 1 (far out), use zoom 2
    // At zoom 30 (very close), use zoom 20 (max)
    return Math.min(20, Math.max(2, Math.floor((zoom / 30) * 18) + 2));
  }, [zoom]);

  // Load Earth texture from Google Earth Engine / Google Maps
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    setLoading(true);

    const loadEarthTexture = async () => {
      try {
        // Use Google Maps Satellite tiles via our proxy
        // Google Maps Satellite uses the same imagery as Google Earth
        // For a globe, we'll use zoom level 2-4 which gives us good quality
        // At zoom 2: 4 tiles (2x2) cover the world
        // At zoom 3: 16 tiles (4x4) cover the world - good quality
        // At zoom 4: 64 tiles (8x8) - very high quality but more tiles to load
        const globeZoom = Math.min(4, Math.max(2, Math.floor(tileZoom / 7) + 2));
        
        // For now, use a single representative tile that covers the globe well
        // At zoom 2, tile (1,1) is a good center point
        // At zoom 3, tile (2,2) works well
        // At zoom 4, tile (4,4) is center
        const centerX = Math.floor(Math.pow(2, globeZoom) / 2);
        const centerY = Math.floor(Math.pow(2, globeZoom) / 2);
        
        // Use our tile proxy which fetches Google Maps Satellite tiles
        // These are the same high-quality satellite images used in Google Earth
        const tileUrl = `/api/earth-simulator/gee/tile/satellite/${globeZoom}/${centerX}/${centerY}`;
        
        loader.load(
          tileUrl,
          (loadedTexture) => {
            // For a globe, we need the texture to wrap properly
            loadedTexture.wrapS = THREE.RepeatWrapping;
            loadedTexture.wrapT = THREE.RepeatWrapping;
            // The texture should cover the full sphere
            loadedTexture.repeat.set(1, 1);
            // Ensure texture is properly formatted
            loadedTexture.format = THREE.RGBAFormat;
            loadedTexture.flipY = false;
            setTexture(loadedTexture);
            setLoading(false);
            if (onTextureUpdate) {
              onTextureUpdate(loadedTexture);
            }
          },
          undefined,
          (error) => {
            console.error("Error loading GEE tile:", error);
            // Fallback to NASA Blue Marble
            loadFallbackTexture();
          }
        );
      } catch (error) {
        console.error("Error in loadEarthTexture:", error);
        loadFallbackTexture();
      }
    };

    const loadFallbackTexture = () => {
      // Fallback to NASA Blue Marble - high quality Earth texture
      loader.load(
        "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg",
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          setTexture(loadedTexture);
          setLoading(false);
          if (onTextureUpdate) {
            onTextureUpdate(loadedTexture);
          }
        },
        undefined,
        (error) => {
          console.error("Error loading fallback texture:", error);
          setLoading(false);
        }
      );
    };

    loadEarthTexture();
  }, [tileZoom, onTextureUpdate]);

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0005; // Slow rotation
    }
  });

  return (
    <mesh ref={globeRef}>
      <sphereGeometry args={[1, 128, 64]} />
      {texture ? (
        <meshStandardMaterial
          map={texture}
          roughness={0.8}
          metalness={0.1}
        />
      ) : (
        <meshStandardMaterial
          color="#1a4d80"
          roughness={0.8}
          metalness={0.2}
        />
      )}
    </mesh>
  );
}
