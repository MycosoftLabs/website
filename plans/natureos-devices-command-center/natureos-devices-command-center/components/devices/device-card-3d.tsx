'use client';

import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

import type { DeviceType } from '@/lib/devices/types';

export function DeviceCard3DIcon(props: { type: DeviceType }) {
  // Keep render cost low: tiny canvas, no shadows.
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [2.4, 2.2, 2.6], fov: 45 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-3, -2, -2]} intensity={0.6} />

      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={0.5}>
        <DeviceShape type={props.type} />
      </Float>
    </Canvas>
  );
}

function DeviceShape(props: { type: DeviceType }) {
  const ref = React.useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.55;
    ref.current.rotation.x += delta * 0.15;
  });

  const material = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: new THREE.Color('#06b6d4'),
        emissiveIntensity: 0.18,
        metalness: 0.65,
        roughness: 0.35,
      }),
    []
  );

  const accent = React.useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b5cf6',
        emissive: new THREE.Color('#8b5cf6'),
        emissiveIntensity: 0.22,
        metalness: 0.55,
        roughness: 0.35,
      }),
    []
  );

  const baseGeo = React.useMemo(() => {
    switch (props.type) {
      case 'gateway':
        return new THREE.BoxGeometry(1.3, 0.45, 1.0, 2, 2, 2);
      case 'switch':
        return new THREE.BoxGeometry(1.35, 0.35, 0.85, 2, 2, 2);
      case 'access_point':
        return new THREE.CylinderGeometry(0.7, 0.7, 0.22, 24);
      case 'server':
      case 'nas':
        return new THREE.BoxGeometry(0.95, 1.05, 0.75, 2, 2, 2);
      case 'mycobrain':
        return new THREE.BoxGeometry(1.05, 0.55, 0.85, 2, 2, 2);
      default:
        return new THREE.IcosahedronGeometry(0.7, 0);
    }
  }, [props.type]);

  return (
    <group ref={ref}>
      <mesh geometry={baseGeo} material={material} />

      {/* Simple “ports” / “LEDs” accent */}
      {props.type === 'switch' || props.type === 'gateway' ? (
        <mesh position={[0, -0.06, 0.52]} material={accent}>
          <boxGeometry args={[0.85, 0.1, 0.06]} />
        </mesh>
      ) : null}

      {props.type === 'mycobrain' ? (
        <group>
          <mesh position={[0.28, 0.22, 0.32]} material={accent}>
            <boxGeometry args={[0.22, 0.16, 0.08]} />
          </mesh>
          <mesh position={[-0.32, 0.18, 0.24]} material={accent}>
            <boxGeometry args={[0.16, 0.12, 0.08]} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
