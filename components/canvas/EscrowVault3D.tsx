"use client";

import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import { Suspense } from "react";

type VaultMode = "locked" | "auditing" | "released";

function VaultModel({ mode }: { mode: VaultMode }) {
  const color = mode === "released" ? "#10B981" : mode === "auditing" ? "#7DD3FC" : "#F4B728";
  return (
    <group>
      <Float speed={mode === "auditing" ? 3 : 1.2} rotationIntensity={0.18} floatIntensity={0.3}>
        <mesh>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.6} />
        </mesh>
        <mesh scale={0.78}>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.25} transparent opacity={0.72} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.35}>
          <torusGeometry args={[1.05, 0.012, 12, 96]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </Float>
      <Sparkles count={mode === "released" ? 90 : 36} scale={4.2} size={2.4} speed={0.35} color={color} />
    </group>
  );
}

export default function EscrowVault3D({ mode = "locked" }: { mode?: VaultMode }) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl bg-[#090c12]">
      <Canvas camera={{ position: [0, 0, 4.8], fov: 42 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 4]} intensity={28} color="#F4B728" />
        <pointLight position={[-3, -2, -2]} intensity={12} color="#10B981" />
        <Suspense fallback={null}>
          <VaultModel mode={mode} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={6} />
      </Canvas>
    </div>
  );
}
