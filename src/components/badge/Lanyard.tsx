import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { cardFaceTexture, strapTexture } from './textures';
import { CAMERA_Z, FOV, SEG, CARD_W, CARD_H } from './anchor';

extend({ MeshLineGeometry, MeshLineMaterial });
declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    // The constructor's parameters are optional at runtime (props are applied after construction).
    meshLineMaterial: Omit<ThreeElement<typeof MeshLineMaterial>, 'args'> & { args?: ConstructorParameters<typeof MeshLineMaterial> };
  }
}

export interface LanyardProps {
  name: string; role: string; photo: string | null;
  /** Anchor in canvas-local CSS px. Called every frame. */
  getAnchorPx: () => { x: number; y: number };
  active: boolean;
  /** Camera field of view; the inline (mobile) canvas is only 380px tall, so it narrows this to enlarge the badge. */
  fov?: number;
  /** Called once the physics world and card have mounted (WASM loaded, first scene ready). */
  onReady?: () => void;
}

const CARD_R = 0.06, CARD_D = 0.03, FACE_Z = CARD_D / 2 + 0.002;

export default function Lanyard({ active, fov = FOV, ...p }: LanyardProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_Z], fov }}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <Physics gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band {...p} />
      </Physics>
    </Canvas>
  );
}

type Seg = RapierRigidBody & { lerped?: THREE.Vector3 };
type V3 = { x: number; y: number; z: number };
const v = (t: V3) => new THREE.Vector3(t.x, t.y, t.z);

function Band({ name, role, photo, getAnchorPx, onReady }: Omit<LanyardProps, 'active' | 'fov'>) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null!);
  const fixed = useRef<Seg>(null!), j1 = useRef<Seg>(null!), j2 = useRef<Seg>(null!), j3 = useRef<Seg>(null!), card = useRef<Seg>(null!);
  const [vec] = useState(() => new THREE.Vector3());
  const [dir] = useState(() => new THREE.Vector3());
  const lastAnchor = useRef({ x: NaN, y: NaN });
  const { size, viewport } = useThree();
  const toWorld = (a: { x: number; y: number }) => ({
    x: (a.x / size.width - 0.5) * viewport.width,
    y: -(a.y / size.height - 0.5) * viewport.height,
  });
  // Spawn the rope already hanging from the first anchor so the card doesn't fly in from the centre.
  const [start] = useState(() => toWorld(getAnchorPx()));
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [face, setFace] = useState<THREE.Texture | null>(null);
  const [strap] = useState(() => strapTexture());

  useEffect(() => {
    let live = true;
    cardFaceTexture(name, role, photo).then((t) => { if (live) setFace(t); else t.dispose(); });
    return () => { live = false; };
  }, [name, role, photo]);
  useEffect(() => () => { face?.dispose(); }, [face]);
  useEffect(() => () => { strap.dispose(); }, [strap]);
  useEffect(() => { onReady?.(); }, [onReady]);

  const seg = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], SEG]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, CARD_H / 2, 0]]);

  useEffect(() => {
    if (!dragged) return;
    document.body.style.cursor = 'grabbing';
    const up = () => drag(false);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
  }, [dragged]);

  useFrame((state, delta) => {
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    const a = getAnchorPx();
    const w = toWorld(a);
    fixed.current.setNextKinematicTranslation({ x: w.x, y: w.y, z: 0 });
    // Kinematic motion doesn't wake sleeping bodies through joints, so wake the chain when the anchor moves.
    if (Math.abs(a.x - lastAnchor.current.x) > 0.01 || Math.abs(a.y - lastAnchor.current.y) > 0.01) {
      [j1, j2, j3, card].forEach((r) => r.current?.wakeUp());
      lastAnchor.current = a;
    }
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    const dt = Math.min(delta, 0.1);
    [j1, j2].forEach((ref) => {
      const r = ref.current!;
      const t = v(r.translation());
      if (!r.lerped) r.lerped = t.clone();
      const d = Math.max(0.1, Math.min(1, r.lerped.distanceTo(t)));
      r.lerped.lerp(t, Math.min(1, dt * (10 + d * 40)));
    });
    curve.points[0]!.copy(v(j3.current.translation()));
    curve.points[1]!.copy(j2.current.lerped!);
    curve.points[2]!.copy(j1.current.lerped!);
    curve.points[3]!.copy(v(fixed.current.translation()));
    band.current.geometry.setPoints(curve.getPoints(32));
    // Ease the card back to facing the camera: damp the y spin by the quaternion's y component.
    const ang = card.current.angvel();
    const rot = card.current.rotation();
    card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, true);
  });

  const { x: sx, y: sy } = start;
  return (
    <>
      <RigidBody ref={fixed} type="kinematicPosition" colliders={false} position={[sx, sy, 0]} />
      <RigidBody position={[sx, sy - SEG, 0]} ref={j1} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 2 * SEG, 0]} ref={j2} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG, 0]} ref={j3} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG - CARD_H / 2, 0]} ref={card} {...seg} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.01]} />
        <group
          onPointerDown={(e) => {
            e.stopPropagation();
            drag(new THREE.Vector3().copy(e.point).sub(v(card.current!.translation())));
          }}
          onPointerOver={() => { document.body.style.cursor = 'grab'; }}
          onPointerOut={() => { if (!dragged) document.body.style.cursor = ''; }}
        >
          <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={CARD_R} smoothness={4}>
            <meshStandardMaterial color="#e8e8f4" roughness={0.55} metalness={0.05} />
          </RoundedBox>
          {/* The face is a plane over each flat side: RoundedBox's extruded bevel UVs would smear the texture. */}
          {face && [0, Math.PI].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry ? -FACE_Z : FACE_Z]}>
              <planeGeometry args={[CARD_W - 2 * CARD_R, CARD_H - 2 * CARD_R]} />
              <meshStandardMaterial map={face} roughness={0.55} metalness={0.05} />
            </mesh>
          ))}
        </group>
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="white" depthTest={false} resolution={[size.width, size.height]} useMap={1} map={strap} repeat={[-4, 1]} lineWidth={0.6} />
      </mesh>
    </>
  );
}
