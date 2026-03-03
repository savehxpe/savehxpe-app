'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { Dodecahedron, Octahedron, Environment } from '@react-three/drei';
import * as THREE from 'three';

function RotatingCore({ isLoaded }: { isLoaded: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerMeshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * (isLoaded ? 2.5 : 0.5);
      meshRef.current.rotation.y += delta * (isLoaded ? 2.5 : 0.6);

      if (isLoaded) {
        meshRef.current.scale.lerp(new THREE.Vector3(2, 2, 2), 0.1);
      }
    }
    if (outerMeshRef.current) {
      outerMeshRef.current.rotation.x -= delta * (isLoaded ? 1.5 : 0.3);
      outerMeshRef.current.rotation.y -= delta * (isLoaded ? 1.5 : 0.4);

      if (isLoaded) {
        outerMeshRef.current.scale.lerp(new THREE.Vector3(3, 3, 3), 0.1);
      }
    }
  });

  return (
    <group>
      {/* Inner solid core */}
      <Octahedron ref={meshRef} args={[1, 0]}>
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.8}
        />
      </Octahedron>

      {/* Outer wireframe shell */}
      <Dodecahedron ref={outerMeshRef} args={[1.5, 0]}>
        <meshStandardMaterial
          color="#4b5563"
          wireframe={true}
          transparent
          opacity={0.4}
        />
      </Dodecahedron>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
    </group>
  );
}

export default function SplashLoading() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const isLoaded = progress >= 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Jumpy, unpredictable progress for that glitchy feel
        return p + Math.floor(Math.random() * 20) + 2;
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      // Small delay after hitting 100% to show speedup animation and flash
      setTimeout(() => {
        router.push('/identity');
      }, 1200);
    }
  }, [isLoaded, router]);

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root bg-[#000000] overflow-hidden selection:bg-white selection:text-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div className={`w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-white rounded-full absolute transition-all duration-1000 ${isLoaded ? 'opacity-20 blur-[150px] scale-150' : 'opacity-5 blur-[100px] animate-pulse-slow'}`}></div>
        <div className="w-full h-full absolute opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
      </div>

      {/* Screen Glitch Effect just upon loading */}
      {isLoaded && <div className="absolute inset-0 bg-white/10 z-50 animate-[flash_0.1s_ease-out_3]"></div>}

      <main className="flex flex-1 flex-col relative justify-center items-center px-4 py-12 lg:py-20 w-full z-10">
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md gap-10">

          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white animate-flicker">savehxpe</h1>
            <p className="text-slate-500 text-xs md:text-sm uppercase tracking-[0.4em] font-medium">Outworld System v2.0</p>
          </div>

          {/* React Three Fiber Canvas */}
          <div className="w-64 h-64 md:w-80 md:h-80 relative flex items-center justify-center">
            <Canvas camera={{ position: [0, 0, 4] }}>
              <RotatingCore isLoaded={isLoaded} />
              <Environment preset="city" />
            </Canvas>
          </div>

          <div className="w-full max-w-xs space-y-6">
            <div className="h-0.5 w-full bg-white/10 overflow-hidden relative">
              <div
                className="absolute top-0 left-0 h-full bg-white transition-all duration-200 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>

            <div className={`flex justify-between items-center text-[10px] font-mono uppercase tracking-widest transition-colors ${isLoaded ? 'text-white' : 'text-slate-500'}`}>
              <span className={!isLoaded ? "animate-pulse" : ""}>
                {isLoaded ? 'ASSETS INITIALIZED' : 'INITIALIZING ASSETS...'}
              </span>
              <span>{Math.min(progress, 100)}%</span>
            </div>
          </div>
        </div>
      </main>

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 MixBlendMode-overlay" style={{ mixBlendMode: 'overlay' }}></div>
      <style jsx global>{`
          @keyframes flash {
              0% { opacity: 0; }
              50% { opacity: 1; }
              100% { opacity: 0; }
          }
      `}</style>
    </div>
  );
}
