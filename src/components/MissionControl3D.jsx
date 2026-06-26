import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Stable pseudo-random based on string
function seededRandom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return () => {
    hash = Math.imul(741103597, hash) + 1950570381 | 0;
    return (hash >>> 0) / 4294967296;
  };
}

function TaskNode({ task, isNextBest, onSelect }) {
  const meshRef = useRef();
  const tetherRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const now = new Date();
  const deadline = new Date(task.deadline);
  const hoursLeft = Math.max(0, (deadline - now) / (1000 * 60 * 60));

  // Determine orbital parameters
  const rng = useMemo(() => seededRandom(task.id), [task.id]);
  const baseAngle = useMemo(() => rng() * Math.PI * 2, [rng]);
  
  // Radius based on time left. Min radius 1.5, max 7.5.
  const radius = task.completed ? 8 : Math.min(7.5, 1.5 + (hoursLeft * 0.12));
  const orbitSpeed = task.completed ? 0.05 : 0.15 + (1 / radius) * 0.3;

  const getGeometry = () => {
    if (task.importance >= 4) {
      return <icosahedronGeometry args={[0.25, 0]} />;
    } else if (task.importance === 3) {
      return <tetrahedronGeometry args={[0.25, 0]} />;
    } else {
      return <octahedronGeometry args={[0.2, 0]} />;
    }
  };

  const getNodeColor = () => {
    if (task.completed) return 'var(--color-mist)';  
    if (hoursLeft <= 12) return 'var(--color-obsidian-ink)'; 
    if (hoursLeft <= 36) return 'var(--color-sage)'; 
    return 'var(--color-bark)';                      
  };

  // Format time left aesthetically
  const formatTimeLeft = () => {
    if (task.completed) return 'DONE';
    const d = Math.floor(hoursLeft / 24);
    const h = Math.floor(hoursLeft % 24);
    if (d > 0) return `T-${d}D ${h}H`;
    return `T-${h}H`;
  };

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (meshRef.current) {
      // Orbital mechanics
      const currentAngle = baseAngle + (time * orbitSpeed);
      meshRef.current.position.x = Math.cos(currentAngle) * radius;
      meshRef.current.position.z = Math.sin(currentAngle) * radius;
      meshRef.current.position.y = Math.sin(time * 2 + baseAngle) * 0.2; // slight bobbing

      meshRef.current.rotation.y = time * 0.5;
      meshRef.current.rotation.x = time * 0.3;

      if (isNextBest) {
        const scale = 1.2 + Math.sin(time * 6) * 0.15;
        meshRef.current.scale.set(scale, scale, scale);
      } else if (hovered) {
        meshRef.current.scale.set(1.4, 1.4, 1.4);
      } else {
        meshRef.current.scale.set(1.0, 1.0, 1.0);
      }

      if (tetherRef.current) {
        const dist = Math.sqrt(meshRef.current.position.x**2 + meshRef.current.position.z**2 + meshRef.current.position.y**2);
        tetherRef.current.scale.set(1, dist, 1);
        tetherRef.current.position.copy(meshRef.current.position).multiplyScalar(0.5);
        tetherRef.current.lookAt(meshRef.current.position);
        tetherRef.current.rotateX(Math.PI / 2);
      }
    }
  });

  return (
    <>
      {/* Tether line for next best action */}
      {isNextBest && (
        <mesh ref={tetherRef}>
          <cylinderGeometry args={[0.015, 0.015, 1, 4]} />
          <meshBasicMaterial color="var(--color-voltage)" transparent opacity={0.6} />
        </mesh>
      )}
      
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(task);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {getGeometry()}
        <meshStandardMaterial
          color={getNodeColor()}
          roughness={0.2}
          metalness={0.8}
          wireframe={false}
          emissive={isNextBest ? 'var(--color-voltage)' : 'var(--color-obsidian-ink)'}
          emissiveIntensity={isNextBest ? 0.6 : 0.1}
        />

        <Html distanceFactor={8} position={[0, 0.4, 0]} center zIndexRange={[10, 0]}>
          <div 
            style={{
              background: 'var(--color-linen)',
              border: `1px solid ${isNextBest ? 'var(--color-voltage)' : 'var(--color-obsidian-ink)'}`,
              padding: '2px 8px',
              color: 'var(--color-obsidian-ink)',
              fontSize: '9px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-twk-lausanne)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isNextBest ? '0 0 10px rgba(49, 246, 82, 0.3)' : 'none'
            }}
            onClick={() => onSelect(task)}
          >
            {/* Tactical Crosshair detail */}
            <div style={{ width: '4px', height: '4px', border: `1px solid ${isNextBest ? 'var(--color-voltage)' : 'var(--color-sage)'}` }}></div>
            <span style={{ color: isNextBest ? 'var(--color-voltage)' : 'var(--color-obsidian-ink)', fontWeight: '800' }}>
              {formatTimeLeft()}
            </span>
            <span style={{ opacity: 0.8 }}>
              {task.title.length > 16 ? `${task.title.slice(0, 16)}...` : task.title}
            </span>
          </div>
        </Html>
      </mesh>
    </>
  );
}

function RadarCore() {
  const coreRef = useRef();
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.2;
      coreRef.current.rotation.x = t * 0.1;
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group>
      {/* Central Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshBasicMaterial color="var(--color-voltage)" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="var(--color-voltage)" emissive="var(--color-voltage)" emissiveIntensity={0.5} />
      </mesh>

      {/* Radar Rings (12h, 24h, 48h horizons) */}
      {[2.94, 4.38, 7.26].map((radius, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.02, 64]} />
          <meshBasicMaterial color="var(--color-sage)" side={THREE.DoubleSide} transparent opacity={0.15} />
        </mesh>
      ))}

      {/* Axis Lines */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 16, 4]} />
        <meshBasicMaterial color="var(--color-mist)" transparent opacity={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 16, 4]} />
        <meshBasicMaterial color="var(--color-mist)" transparent opacity={0.1} />
      </mesh>

      <Html position={[0, -0.6, 0]} center zIndexRange={[10, 0]}>
        <div style={{ 
          color: 'var(--color-voltage)', 
          fontSize: '9px', 
          fontWeight: '800', 
          letterSpacing: '2px', 
          textTransform: 'uppercase',
          background: 'var(--color-linen)',
          padding: '2px 6px',
          border: '1px solid var(--color-voltage)'
        }}>
          T-ZERO
        </div>
      </Html>
    </group>
  );
}

export default function MissionControl3D({ tasks, nextBestActionId, onSelectTask }) {
  return (
    <div className="w-full h-[350px] relative border-y border-[var(--color-obsidian-ink)] bg-[var(--color-linen)]">
      <div className="absolute top-4 left-4 z-10 font-sans text-[11px] font-bold uppercase tracking-widest text-[var(--color-sage)] pointer-events-none">
        Deep Space Orbital Radar
      </div>
      <div className="absolute top-4 right-4 z-10 font-mono text-[9px] uppercase tracking-widest text-[var(--color-sage)] pointer-events-none text-right flex flex-col gap-1">
        <div><span className="inline-block w-2 h-2 bg-[var(--color-voltage)] mr-2"></span>NEXT ACTION TETHER</div>
        <div><span className="inline-block w-2 h-2 bg-[var(--color-sage)] mr-2 opacity-50"></span>12H HORIZON</div>
        <div><span className="inline-block w-2 h-2 bg-[var(--color-sage)] mr-2 opacity-30"></span>24H HORIZON</div>
        <div><span className="inline-block w-2 h-2 bg-[var(--color-sage)] mr-2 opacity-10"></span>48H HORIZON</div>
      </div>
      <Canvas
        camera={{ position: [0, 6, 8], fov: 45 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#0a0d0a']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[6, 12, 6]} intensity={0.5} />
        <directionalLight position={[-6, 6, -6]} intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={0.8} distance={10} color="#31f652" />

        <RadarCore />

        {tasks.map(task => (
          <TaskNode
            key={task.id}
            task={task}
            isNextBest={task.id === nextBestActionId}
            onSelect={onSelectTask}
          />
        ))}

        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          maxDistance={15} 
          minDistance={3}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 8}
        />
      </Canvas>
    </div>
  );
}
