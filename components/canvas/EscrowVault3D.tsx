"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

type Mode = "locked" | "auditing" | "released";

function Fasteners({ radius, count = 12, depth = 0.09 }: { radius: number; count?: number; depth?: number }) {
  return <group>
    {Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2;
      return <group key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, depth]}>
        <mesh><cylinderGeometry args={[0.045, 0.045, 0.035, 16]} /><meshStandardMaterial color="#8994a2" metalness={0.88} roughness={0.28} /></mesh>
        <mesh position={[0, 0, 0.021]}><boxGeometry args={[0.045, 0.006, 0.006]} /><meshStandardMaterial color="#273343" metalness={0.7} /></mesh>
      </group>;
    })}
  </group>;
}

function VaultDoor({ mode }: { mode: Mode }) {
  const accent = mode === "auditing" ? "#9dbbd5" : mode === "released" ? "#83b49f" : "#c6a36c";
  return <group rotation={[0, 0, 0]}>
    {/* Heavy rectangular safe housing */}
    <mesh position={[0, 0, -0.22]}>
      <boxGeometry args={[2.85, 2.55, 0.42]} />
      <meshStandardMaterial color="#202b38" metalness={0.78} roughness={0.42} />
    </mesh>
    <mesh position={[0, 0, 0.015]}>
      <boxGeometry args={[2.67, 2.37, 0.12]} />
      <meshStandardMaterial color="#66717e" metalness={0.82} roughness={0.32} />
    </mesh>
    <mesh position={[0, 0, 0.09]}>
      <cylinderGeometry args={[1.04, 1.04, 0.16, 96]} rotation={[Math.PI / 2, 0, 0]} />
      <meshStandardMaterial color="#303c49" metalness={0.9} roughness={0.3} />
    </mesh>
    {/* Concentric machined steel rings */}
    {[0.98, 0.87, 0.73].map((r, i) => <mesh key={r} position={[0, 0, 0.19 + i * 0.025]}>
      <torusGeometry args={[r, i === 0 ? 0.045 : 0.018, 12, 96]} />
      <meshStandardMaterial color={i === 0 ? "#aab3bd" : "#566474"} metalness={0.94} roughness={0.24} />
    </mesh>)}
    <Fasteners radius={0.91} count={16} depth={0.225} />
    {/* Inner circular door plate */}
    <mesh position={[0, 0, 0.2]}>
      <cylinderGeometry args={[0.69, 0.69, 0.12, 96]} />
      <meshStandardMaterial color="#394654" metalness={0.86} roughness={0.36} />
    </mesh>
    <mesh position={[0, 0, 0.275]}>
      <torusGeometry args={[0.58, 0.014, 12, 96]} />
      <meshStandardMaterial color="#b1bac4" metalness={0.92} roughness={0.24} />
    </mesh>
    {/* Central locking hub */}
    <mesh position={[0, 0, 0.31]}>
      <cylinderGeometry args={[0.23, 0.23, 0.13, 48]} />
      <meshStandardMaterial color="#8d99a5" metalness={0.95} roughness={0.22} />
    </mesh>
    <mesh position={[0, 0, 0.39]}>
      <cylinderGeometry args={[0.13, 0.13, 0.035, 40]} />
      <meshStandardMaterial color={accent} metalness={0.78} roughness={0.24} />
    </mesh>
    {/* Three-spoke mechanical locking wheel */}
    {[0, 2.094, 4.188].map((angle) => <group key={angle} rotation={[0, 0, angle]}>
      <mesh position={[0, 0.39, 0.34]}>
        <boxGeometry args={[0.045, 0.48, 0.055]} />
        <meshStandardMaterial color="#9aa5af" metalness={0.92} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.61, 0.34]}>
        <cylinderGeometry args={[0.065, 0.065, 0.09, 24]} />
        <meshStandardMaterial color="#b2bbc4" metalness={0.95} roughness={0.2} />
      </mesh>
    </group>)}
    {/* Door hinges and status indicator */}
    {[-0.72, 0, 0.72].map((y) => <mesh key={y} position={[1.34, y, -0.02]}>
      <boxGeometry args={[0.12, 0.24, 0.3]} />
      <meshStandardMaterial color="#687482" metalness={0.9} roughness={0.3} />
    </mesh>)}
    <mesh position={[0, -1.02, 0.09]}>
      <boxGeometry args={[0.42, 0.055, 0.025]} />
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.12} metalness={0.5} roughness={0.35} />
    </mesh>
    {/* Fine engraved perimeter detail */}
    <mesh position={[0, 0, -0.005]}>
      <boxGeometry args={[2.48, 2.18, 0.015]} />
      <meshStandardMaterial color="#9aa5af" metalness={0.7} roughness={0.55} wireframe />
    </mesh>
  </group>;
}

export default function EscrowVault3D({ mode = "locked" }: { mode?: Mode }) {
  return <div className="h-full min-h-[220px] w-full">
    <Canvas camera={{ position: [0.25, 0.2, 5.6], fov: 34 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#dce5ef", "#18212c", 1.05]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.1} color="#fff1d7" />
      <directionalLight position={[4, -2, -3]} intensity={1.2} color="#8298b0" />
      <VaultDoor mode={mode} />
      <ContactShadows position={[0, -1.35, -0.3]} opacity={0.28} scale={4.5} blur={2.8} far={3.5} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={1.25} maxPolarAngle={1.9} autoRotate autoRotateSpeed={0.12} />
    </Canvas>
  </div>;
}
