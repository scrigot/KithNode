"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const HUB_COUNT = 56;
const AMBIENT_COUNT = 140;
const HUB_RADIUS = 1.55;
const AMBIENT_RADIUS = 1.5;
const HUB_CONNECTION_THRESHOLD = 1.0;
const PULSE_SLOT_COUNT = 18;

type PulseSlot = {
  from: number;
  to: number;
  startTime: number;
  duration: number;
};

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    out.push(
      new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(
        radius,
      ),
    );
  }
  return out;
}

function pickDifferent(exclude: number, count: number) {
  let to = Math.floor(Math.random() * count);
  while (to === exclude) to = Math.floor(Math.random() * count);
  return to;
}

function makePersonTokenTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    // Soft cyan radial glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    glow.addColorStop(0, "rgba(165, 243, 252, 1)");
    glow.addColorStop(0.18, "rgba(34, 211, 238, 0.85)");
    glow.addColorStop(0.45, "rgba(34, 211, 238, 0.25)");
    glow.addColorStop(0.75, "rgba(34, 211, 238, 0.06)");
    glow.addColorStop(1, "rgba(34, 211, 238, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // White person silhouette
    ctx.fillStyle = "#ffffff";
    // head
    ctx.beginPath();
    ctx.arc(cx, size * 0.42, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // shoulders / torso
    ctx.beginPath();
    const top = size * 0.56;
    const bottom = size * 0.7;
    const half = size * 0.14;
    ctx.moveTo(cx - half, bottom);
    ctx.quadraticCurveTo(cx - half - 4, top, cx, top);
    ctx.quadraticCurveTo(cx + half + 4, top, cx + half, bottom);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function AmbientDots({ nodes }: { nodes: THREE.Vector3[] }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    for (let i = 0; i < nodes.length; i++) {
      arr[i * 3] = nodes[i].x;
      arr[i * 3 + 1] = nodes[i].y;
      arr[i * 3 + 2] = nodes[i].z;
    }
    return arr;
  }, [nodes]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#22d3ee"
        size={0.04}
        transparent
        opacity={0.7}
        sizeAttenuation
        toneMapped={false}
        depthWrite={false}
      />
    </points>
  );
}

function HubNode({
  index,
  position,
  pulses,
  hoveredIdx,
  isNeighbor,
  onHover,
  onUnhover,
  personTex,
}: {
  index: number;
  position: THREE.Vector3;
  pulses: { current: PulseSlot[] };
  hoveredIdx: number | null;
  isNeighbor: boolean;
  onHover: (i: number) => void;
  onUnhover: () => void;
  personTex: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.SpriteMaterial>(null);
  const isHovered = hoveredIdx === index;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + index * 0.21;
    const breath = 1 + Math.sin(t * 1.6) * 0.12;

    let flash = 0;
    for (const p of pulses.current) {
      if (p.from !== index && p.to !== index) continue;
      const age = (state.clock.elapsedTime - p.startTime) / p.duration;
      if (age >= 0 && age <= 1) {
        flash = Math.max(flash, Math.sin(age * Math.PI));
      }
    }

    const hoverScale = isHovered ? 1.55 : isNeighbor ? 1.2 : 1.0;
    groupRef.current.scale.setScalar(breath * hoverScale * (1 + flash * 0.18));

    if (matRef.current) {
      const target = (isHovered ? 1 : isNeighbor ? 0.92 : 0.78) + flash * 0.22;
      matRef.current.opacity = THREE.MathUtils.lerp(
        matRef.current.opacity,
        Math.min(1, target),
        0.2,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(index);
      }}
      onPointerOut={() => onUnhover()}
    >
      <sprite scale={[0.24, 0.24, 1]}>
        <spriteMaterial
          ref={matRef}
          map={personTex}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

function PulseLine({
  slot,
  hubs,
}: {
  slot: PulseSlot;
  hubs: THREE.Vector3[];
}) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const positions = useMemo(() => new Float32Array(6), []);

  useFrame((state) => {
    if (!matRef.current || !geomRef.current) return;
    const age = (state.clock.elapsedTime - slot.startTime) / slot.duration;
    if (age < 0 || age > 1) {
      matRef.current.opacity = 0;
      return;
    }
    matRef.current.opacity = Math.sin(age * Math.PI);

    const a = hubs[slot.from];
    const b = hubs[slot.to];
    positions[0] = a.x;
    positions[1] = a.y;
    positions[2] = a.z;
    positions[3] = b.x;
    positions[4] = b.y;
    positions[5] = b.z;
    (geomRef.current.attributes.position as THREE.BufferAttribute).needsUpdate =
      true;
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color="#a5f3fc"
        transparent
        opacity={0}
        toneMapped={false}
      />
    </lineSegments>
  );
}

function PulseRecycler({
  hubs,
  hoveredIdx,
  slotsRef,
}: {
  hubs: THREE.Vector3[];
  hoveredIdx: number | null;
  slotsRef: { current: PulseSlot[] };
}) {
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    for (const slot of slotsRef.current) {
      const age = (now - slot.startTime) / slot.duration;
      if (age <= 1) continue;
      const biasToHover =
        hoveredIdx !== null && Math.random() < 0.6 ? hoveredIdx : null;
      slot.from =
        biasToHover !== null
          ? biasToHover
          : Math.floor(Math.random() * hubs.length);
      slot.to = pickDifferent(slot.from, hubs.length);
      const fast = hoveredIdx !== null;
      slot.startTime = now + Math.random() * (fast ? 0.12 : 0.4);
      slot.duration = (fast ? 0.55 : 1.1) + Math.random() * 0.5;
    }
  });
  return null;
}

function NetworkGraph() {
  const hubs = useMemo(() => fibonacciSphere(HUB_COUNT, HUB_RADIUS), []);
  const ambient = useMemo(
    () => fibonacciSphere(AMBIENT_COUNT, AMBIENT_RADIUS),
    [],
  );
  const personTex = useMemo(() => makePersonTokenTexture(), []);

  const edges = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        if (hubs[i].distanceTo(hubs[j]) < HUB_CONNECTION_THRESHOLD) {
          out.push([i, j]);
        }
      }
    }
    return out;
  }, [hubs]);

  const neighbors = useMemo(() => {
    const adj: Set<number>[] = hubs.map(() => new Set<number>());
    for (const [i, j] of edges) {
      adj[i].add(j);
      adj[j].add(i);
    }
    return adj;
  }, [edges, hubs]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const slotsRef = useRef<PulseSlot[]>(
    Array.from({ length: PULSE_SLOT_COUNT }, (_, i) => {
      const from = i % HUB_COUNT;
      let to = (i * 3 + 1) % HUB_COUNT;
      if (to === from) to = (to + 1) % HUB_COUNT;
      return {
        from,
        to,
        startTime: -i * 0.22,
        duration: 1.1 + ((i * 0.17) % 0.6),
      };
    }),
  );

  return (
    <group>
      <PulseRecycler hubs={hubs} hoveredIdx={hoveredIdx} slotsRef={slotsRef} />

      <AmbientDots nodes={ambient} />

      {edges.map(([i, j], idx) => {
        const highlighted = hoveredIdx === i || hoveredIdx === j;
        return (
          <Line
            key={`e-${idx}`}
            points={[hubs[i], hubs[j]]}
            color={highlighted ? "#a5f3fc" : "#22d3ee"}
            lineWidth={highlighted ? 1.6 : 1}
            transparent
            opacity={highlighted ? 0.95 : 0.35}
          />
        );
      })}

      {slotsRef.current.map((slot, i) => (
        <PulseLine key={`p-${i}`} slot={slot} hubs={hubs} />
      ))}

      {hubs.map((p, i) => (
        <HubNode
          key={`h-${i}`}
          index={i}
          position={p}
          pulses={slotsRef}
          hoveredIdx={hoveredIdx}
          isNeighbor={hoveredIdx !== null && neighbors[hoveredIdx].has(i)}
          onHover={setHoveredIdx}
          onUnhover={() => setHoveredIdx(null)}
          personTex={personTex}
        />
      ))}
    </group>
  );
}

export function HeroNetwork() {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[-5, -5, 5]} intensity={0.6} color="#0ea5e9" />
        <NetworkGraph />
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.0}
          enableZoom={false}
          enablePan={false}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
