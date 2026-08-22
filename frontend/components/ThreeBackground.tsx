// File: frontend/components/ThreeBackground.tsx
'use client';

import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWindowSize } from '../hooks/useWindowSize';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Utility hook for smooth mouse parallax */
function useMouseParallax(speed = 0.05) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Update mouse position on move (only when not reduced-motion)
  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  useFrame(() => {
    // gentle rotation based on mouse
    camera.rotation.x = lerp(camera.rotation.x, mouse.current.y * speed, 0.1);
    camera.rotation.y = lerp(camera.rotation.y, mouse.current.x * speed, 0.1);
  });
}

/** Simple particle field using Points */
function ParticleField({ count }: { count: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 200; // x
      arr[i * 3 + 1] = (Math.random() - 0.5) * 200; // y
      arr[i * 3 + 2] = (Math.random() - 0.5) * 200; // z
    }
    return arr;
  }, [count]);

  const pointMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.8,
      sizeAttenuation: true,
      color: new THREE.Color('#6366F1'),
      transparent: true,
      opacity: 0.7,
    });
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <primitive object={pointMaterial} attach="material" />
    </points>
  );
}

/** Node network – simple spheres linked by lines */
function NodeNetwork({ nodeCount }: { nodeCount: number }) {
  const group = useRef<THREE.Group>(null!);
  const nodes = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120,
        ),
      );
    }
    return pts;
  }, [nodeCount]);

  // animate pulsing scale per node
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    group.current.children.forEach((obj, i) => {
      const scale = 1 + 0.2 * Math.sin(time + i);
      obj.scale.setScalar(scale);
    });
  });

  return (
    <group ref={group}>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[2, 8, 8]} />
          <meshBasicMaterial color="#A5B4FC" />
        </mesh>
      ))}
      {/* Simple lines connecting sequential nodes */}
      {nodes.map((p, i) => {
        if (i === 0) return null;
        const prev = nodes[i - 1];
        const geometry = new THREE.BufferGeometry().setFromPoints([prev, p]);
        const material = new THREE.LineBasicMaterial({ color: '#6366F1', linewidth: 0.5, transparent: true, opacity: 0.4 });
        const lineObj = new THREE.Line(geometry, material);
        return <primitive key={`line-${i}`} object={lineObj} />;
      })}
    </group>
  );
}

/** Central AI core with pulsating ring */
function CoreOrbit() {
  const coreRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scale = 1 + 0.05 * Math.sin(t * 2);
    coreRef.current.scale.setScalar(scale);
    ringRef.current.rotation.z += 0.001;
    const ringScale = 1 + 0.02 * Math.sin(t * 3);
    ringRef.current.scale.setScalar(ringScale);
  });
  return (
    <group>
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      <mesh ref={ringRef} rotation-x={Math.PI / 2}>
        <torusGeometry args={[9, 0.4, 8, 30]} />
        <meshBasicMaterial color="#34D399" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/** Expanding radar pulse */
function RadarPulse() {
  const pulseRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scale = 1 + (t % 5) * 0.4;
    const opacity = Math.max(0, 1 - (t % 5) * 0.2);
    pulseRef.current.scale.setScalar(scale);
    (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.3;
  });
  return (
    <mesh ref={pulseRef}>
      <ringGeometry args={[10, 10.5, 64]} />
      <meshBasicMaterial color="#6366F1" transparent depthWrite={false} />
    </mesh>
  );
}

function MouseParallaxDriver() {
  useMouseParallax()
  return null
}

/** Main background component */
export default function ThreeBackground() {
  const { width } = useWindowSize();
  const reduced = useReducedMotion();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  const particleCount = isDesktop ? 8000 : isTablet ? 4000 : 2000;
  const nodeCount = isDesktop ? 40 : isTablet ? 25 : 12;

  const enableBloom = isDesktop && !reduced;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 120], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Ambient dark sphere for depth */}
        <mesh>
          <sphereGeometry args={[200, 32, 32]} />
          <meshBasicMaterial color="#0a0a0a" side={THREE.BackSide} />
        </mesh>
        {/* Core & radar */}
        <CoreOrbit />
        <RadarPulse />
        {/* Node network */}
        <NodeNetwork nodeCount={nodeCount} />
        {/* Particles */}
        <ParticleField count={particleCount} />
        {/* Mouse parallax – disabled on mobile‑low‑perf */}
        {(!isMobile || !reduced) && <MouseParallaxDriver />}
        {/* Lighting – minimal */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 50, 100]} intensity={0.6} />
        {/* Optional bloom – placeholder comment */}
        {/* {enableBloom && <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />} */}
      </Canvas>
    </div>
  );
}
