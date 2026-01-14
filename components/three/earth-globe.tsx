"use client";

/**
 * EarthGlobe - 3D Earth visualization for CREP/OEI Dashboard
 * 
 * Features:
 * - High-resolution Earth texture
 * - Topology/bump mapping
 * - Night lights overlay
 * - Atmosphere glow effect
 * - Event markers with 3D pins
 * - Device location markers
 * - Animated rotation
 */

import { useRef, useMemo, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { Html } from "@react-three/drei";

interface EarthGlobeProps {
  events?: Array<{
    id: string;
    type: string;
    title: string;
    severity: string;
    lat: number;
    lng: number;
  }>;
  devices?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: "online" | "offline";
  }>;
  autoRotate?: boolean;
  rotationSpeed?: number;
}

// Convert lat/lng to 3D sphere coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

// Event type colors
const eventColors: Record<string, string> = {
  earthquake: "#ef4444",
  volcano: "#f97316",
  wildfire: "#dc2626",
  storm: "#6366f1",
  lightning: "#facc15",
  tornado: "#7c3aed",
  solar_flare: "#fbbf24",
  fungal_bloom: "#22c55e",
  default: "#3b82f6",
};

// Severity to scale mapping
const severityScale: Record<string, number> = {
  info: 0.02,
  low: 0.025,
  medium: 0.03,
  high: 0.04,
  critical: 0.05,
  extreme: 0.06,
};

// Atmosphere shader
function Atmosphere({ radius = 1.02 }: { radius?: number }) {
  return (
    <mesh scale={[radius, radius, radius]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        transparent
        side={THREE.BackSide}
        uniforms={{
          glowColor: { value: new THREE.Color("#00a8ff") },
          viewVector: { value: new THREE.Vector3(0, 0, 1) },
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vNormal;
          uniform vec3 glowColor;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, 1.0) * intensity;
          }
        `}
      />
    </mesh>
  );
}

// Event marker component
function EventMarker({ 
  position, 
  color, 
  scale, 
  title,
  pulsing = false 
}: { 
  position: THREE.Vector3; 
  color: string; 
  scale: number;
  title: string;
  pulsing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current && pulsing) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 1;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[scale, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {hovered && (
        <Html distanceFactor={3} style={{ pointerEvents: "none" }}>
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {title}
          </div>
        </Html>
      )}
    </group>
  );
}

// Device marker component  
function DeviceMarker({
  position,
  name,
  online = true,
}: {
  position: THREE.Vector3;
  name: string;
  online?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.02, 0.04, 0.02]} />
        <meshBasicMaterial color={online ? "#22c55e" : "#ef4444"} />
      </mesh>
      {hovered && (
        <Html distanceFactor={3} style={{ pointerEvents: "none" }}>
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            🍄 {name} ({online ? "Online" : "Offline"})
          </div>
        </Html>
      )}
    </group>
  );
}

export function EarthGlobe({ 
  events = [], 
  devices = [],
  autoRotate = true, 
  rotationSpeed = 0.001 
}: EarthGlobeProps) {
  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  
  // Load textures - using NASA Blue Marble imagery
  const [earthMap, bumpMap, specularMap, cloudsMap, nightMap] = useLoader(TextureLoader, [
    "/textures/earth/earth_daymap.jpg",
    "/textures/earth/earth_bump.jpg",
    "/textures/earth/earth_specular.jpg",
    "/textures/earth/earth_clouds.png",
    "/textures/earth/earth_nightmap.jpg",
  ].map(path => {
    // Fallback to online textures if local not available
    if (typeof window !== "undefined") {
      return path;
    }
    return path;
  }));

  // Auto-rotation
  useFrame(() => {
    if (earthRef.current && autoRotate) {
      earthRef.current.rotation.y += rotationSpeed;
    }
    if (cloudsRef.current && autoRotate) {
      cloudsRef.current.rotation.y += rotationSpeed * 1.5;
    }
  });

  // Convert events to 3D markers
  const eventMarkers = useMemo(() => {
    return events.map(event => ({
      ...event,
      position: latLngToVector3(event.lat, event.lng, 1.01),
      color: eventColors[event.type] || eventColors.default,
      scale: severityScale[event.severity] || 0.03,
    }));
  }, [events]);

  // Convert devices to 3D markers
  const deviceMarkers = useMemo(() => {
    return devices.map(device => ({
      ...device,
      position: latLngToVector3(device.lat, device.lng, 1.02),
    }));
  }, [devices]);

  return (
    <group ref={earthRef}>
      {/* Earth sphere */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={earthMap}
          bumpMap={bumpMap}
          bumpScale={0.05}
          specularMap={specularMap}
          specular={new THREE.Color("#333333")}
          shininess={5}
        />
      </mesh>

      {/* Night lights layer */}
      <mesh>
        <sphereGeometry args={[1.001, 64, 64]} />
        <meshBasicMaterial
          map={nightMap}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Clouds layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.01, 64, 64]} />
        <meshPhongMaterial
          map={cloudsMap}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>

      {/* Atmosphere glow */}
      <Atmosphere radius={1.15} />

      {/* Event markers */}
      {eventMarkers.map((event) => (
        <EventMarker
          key={event.id}
          position={event.position}
          color={event.color}
          scale={event.scale}
          title={event.title}
          pulsing={event.severity === "critical" || event.severity === "extreme"}
        />
      ))}

      {/* Device markers */}
      {deviceMarkers.map((device) => (
        <DeviceMarker
          key={device.id}
          position={device.position}
          name={device.name}
          online={device.status === "online"}
        />
      ))}
    </group>
  );
}

// Fallback globe with basic appearance (no textures required)
export function FallbackEarthGlobe({ 
  events = [], 
  devices = [],
  autoRotate = true, 
  rotationSpeed = 0.001 
}: EarthGlobeProps) {
  const earthRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (earthRef.current && autoRotate) {
      earthRef.current.rotation.y += rotationSpeed;
    }
  });

  // Convert events to 3D markers
  const eventMarkers = useMemo(() => {
    return events.map(event => ({
      ...event,
      position: latLngToVector3(event.lat, event.lng, 1.01),
      color: eventColors[event.type] || eventColors.default,
      scale: severityScale[event.severity] || 0.03,
    }));
  }, [events]);

  // Convert devices to 3D markers
  const deviceMarkers = useMemo(() => {
    return devices.map(device => ({
      ...device,
      position: latLngToVector3(device.lat, device.lng, 1.02),
    }));
  }, [devices]);

  return (
    <group ref={earthRef}>
      {/* Earth sphere with procedural colors */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          color="#1a4a7a"
          emissive="#0a2a4a"
          emissiveIntensity={0.1}
          shininess={10}
        />
      </mesh>

      {/* Simple grid lines for continents */}
      <mesh>
        <sphereGeometry args={[1.005, 32, 32]} />
        <meshBasicMaterial
          color="#2a6a9a"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Atmosphere glow */}
      <Atmosphere radius={1.1} />

      {/* Event markers */}
      {eventMarkers.map((event) => (
        <EventMarker
          key={event.id}
          position={event.position}
          color={event.color}
          scale={event.scale}
          title={event.title}
          pulsing={event.severity === "critical" || event.severity === "extreme"}
        />
      ))}

      {/* Device markers */}
      {deviceMarkers.map((device) => (
        <DeviceMarker
          key={device.id}
          position={device.position}
          name={device.name}
          online={device.status === "online"}
        />
      ))}
    </group>
  );
}
