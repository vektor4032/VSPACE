import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
function Sculpture() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.16;
      ref.current.position.x = THREE.MathUtils.lerp(
        ref.current.position.x,
        state.pointer.x * 0.12,
        0.03,
      );
      ref.current.position.y = THREE.MathUtils.lerp(
        ref.current.position.y,
        state.pointer.y * 0.12,
        0.03,
      );
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.15;
    }
  });
  return (
    <group ref={ref} rotation={[0.5, 0, -0.5]}>
      <mesh>
        <torusKnotGeometry args={[1.25, 0.34, 160, 24, 2, 3]} />
        <meshStandardMaterial
          color="#c7d2cc"
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[1.1, 0.4, 0.2]}>
        <torusGeometry args={[2, 0.025, 12, 100]} />
        <meshStandardMaterial
          color="#b7ff36"
          emissive="#b7ff36"
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[1.8, 0.8, 0]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial
          color="#b7ff36"
          emissive="#b7ff36"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}
export default function Orb() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 44 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 5, 4]} intensity={5} color="#e9ffec" />
      <pointLight position={[-3, -1, 2]} intensity={35} color="#b7ff36" />
      <pointLight position={[0, 3, -2]} intensity={40} color="#8664ff" />
      <Sculpture />
    </Canvas>
  );
}
