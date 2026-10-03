import * as THREE from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Canvas, extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cardFaceTexture, sheenTexture, strapTexture, STRAP_TILE_ASPECT } from './textures';
import { CAMERA_Z, FOV, SEG, CARD_W, CARD_H, CLIP_H } from './anchor';

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
  /** Text woven into the strap. */
  label: string;
  /** Anchor in canvas-local CSS px. Called every frame. */
  getAnchorPx: () => { x: number; y: number };
  active: boolean;
  /** Camera field of view; the inline (mobile) canvas is only 410px tall, so it narrows this to enlarge the badge. */
  fov?: number;
  /** Device pixel ratio range; the inline (mobile) canvas renders at [1, 1]. */
  dpr?: [number, number];
  /** Called once the physics world and card have mounted (WASM loaded) and the card face texture has resolved. */
  onReady?: () => void;
}

const CARD_R = 0.06, CARD_D = 0.03, FACE_Z = CARD_D / 2 + 0.002;
/** Clear plastic sleeve around the card: a little larger on every side. */
const SLEEVE_PAD = 0.05, SLEEVE_D = CARD_D + 0.05;
/** Strap width in world units. meshline's lineWidth is camera-relative (px = lineWidth · viewportH / (2·CAMERA_Z)),
 *  so lineWidth = STRAP_W / tan(fov/2) keeps the same width relative to the card at every FOV. */
const STRAP_W = 0.17;
/** Rope length between the kinematic anchor and the ring (three segments), for the strap texture repeat. */
const ROPE = 3 * SEG;
/** Ring (torus) radius and its centre above the card's top edge; the strap attaches at the ring's top (CLIP_H). */
const RING_R = 0.06, RING_Y = CARD_H / 2 + CLIP_H - RING_R;

/** Image-based lighting from three's procedural RoomEnvironment (no HDR download), so the metal clip and the plastic
 *  sleeve get reflections. Built once per canvas. */
function RoomLight() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pm.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.7;
    room.dispose(); pm.dispose();
    invalidate();
    return () => { scene.environment = null; env.dispose(); };
  }, [gl, scene, invalidate]);
  return null;
}

export default function Lanyard({ active, fov = FOV, dpr = [1, 1.5], ...p }: LanyardProps) {
  const grab = useRef<HTMLDivElement>(null);
  return (
    <>
    <Canvas
      camera={{ position: [0, 0, CAMERA_Z], fov }}
      dpr={dpr}
      // Render on demand: Rapier invalidates while any body is awake, and Band invalidates on scroll/resize (anchor
      // moves), hover/drag and while the strap smoothing settles. A resting badge costs no frames.
      frameloop={active ? 'demand' : 'never'}
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      eventPrefix="client"
      gl={{ alpha: true, antialias: true }}
      style={{ pointerEvents: 'none' }}
    >
      <RoomLight />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 6]} intensity={1.4} />
      <directionalLight position={[-4, 2, 3]} intensity={0.35} color="#9ec5ff" />
      <Physics gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band {...p} fov={fov} active={active} grab={grab} />
      </Physics>
    </Canvas>
    {/* Touch grab area: touch has no hover, so the click-through canvas can't switch to capturing before a touch
        starts, and the browser would turn a vertical drag into a page scroll (pointercancel ends the drag). This box
        tracks the card's on-screen bounds with touch-action: none, so a touch that starts on the card drags it; R3F
        still gets the events through its document.body listeners. Shown only on coarse pointers (global.css). */}
    <div ref={grab} className="badge-grab" data-badge-grab style={{ visibility: active ? undefined : 'hidden' }} />
    </>
  );
}

type Seg = RapierRigidBody & { lerped?: THREE.Vector3 };
type V3 = { x: number; y: number; z: number };
const v = (t: V3) => new THREE.Vector3(t.x, t.y, t.z);

const GRAB_PAD = 6; // px around the card's projected bounds
const corner = new THREE.Vector3();

function Band({ name, role, photo, label, fov, getAnchorPx, onReady, active, grab }: Omit<LanyardProps, 'dpr'> & { fov: number; grab: RefObject<HTMLDivElement | null> }) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null!);
  const cardGroup = useRef<THREE.Group>(null!);
  const grabRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const fixed = useRef<Seg>(null!), j1 = useRef<Seg>(null!), j2 = useRef<Seg>(null!), j3 = useRef<Seg>(null!), card = useRef<Seg>(null!);
  const [vec] = useState(() => new THREE.Vector3());
  const [dir] = useState(() => new THREE.Vector3());
  const lastAnchor = useRef({ x: NaN, y: NaN });
  /** Last time something moved the badge on purpose (anchor, drag, hover); drives the forced sleep below. */
  const lastActive = useRef(performance.now());
  const { size, viewport, gl, invalidate } = useThree();
  const toWorld = (a: { x: number; y: number }) => ({
    x: (a.x / size.width - 0.5) * viewport.width,
    y: -(a.y / size.height - 0.5) * viewport.height,
  });
  // Spawn the rope already hanging from the first anchor so the card doesn't fly in from the centre.
  const [start] = useState(() => toWorld(getAnchorPx()));
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  const [dragged, drag] = useState<false | THREE.Vector3>(false);
  const [face, setFace] = useState<THREE.Texture | null>(null);
  const [strap] = useState(() => strapTexture(label));
  const [sheen] = useState(() => sheenTexture((CARD_H + 2 * SLEEVE_PAD) / (CARD_W + 2 * SLEEVE_PAD), (CARD_R + SLEEVE_PAD) / (CARD_W + 2 * SLEEVE_PAD)));

  useEffect(() => {
    let live = true;
    cardFaceTexture(name, role, photo).then((t) => { if (live) setFace(t); else t.dispose(); });
    return () => { live = false; };
  }, [name, role, photo]);
  useEffect(() => () => { face?.dispose(); }, [face]);
  useEffect(() => () => { strap.dispose(); }, [strap]);
  useEffect(() => () => { sheen.dispose(); }, [sheen]);
  // Wait for the face texture so the swap from the static badge never shows a blank card.
  useEffect(() => { if (face) onReady?.(); }, [face, onReady]);

  const seg = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], SEG]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], SEG]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, CARD_H / 2 + CLIP_H, 0]]);

  // The canvas is click-through (pointer-events: none) except over the card. Hover is raycast by R3F from body
  // pointermoves, so the canvas switches to pointer-events: auto synchronously on pointerover; the following
  // pointerdown/click then lands on the canvas instead of the link underneath.
  const hovered = useRef(false), dragging = useRef(false);
  const syncCapture = () => {
    gl.domElement.style.pointerEvents = hovered.current || dragging.current ? 'auto' : '';
    document.body.style.cursor = dragging.current ? 'grabbing' : hovered.current ? 'grab' : '';
    grab.current?.toggleAttribute('data-dragging', dragging.current);
  };
  useEffect(() => () => { hovered.current = dragging.current = false; syncCapture(); }, []);
  // Frames stop when paused (off-screen / hidden tab), so the hover re-check below can't run: drop capture.
  useEffect(() => { if (!active) { hovered.current = dragging.current = false; drag(false); syncCapture(); } else invalidate(); }, [active, invalidate]);
  // The anchor follows the page, so scroll and resize must wake the demand frame loop.
  useEffect(() => {
    const wake = () => invalidate();
    addEventListener('scroll', wake, { passive: true });
    addEventListener('resize', wake);
    return () => { removeEventListener('scroll', wake); removeEventListener('resize', wake); };
  }, [invalidate]);

  useEffect(() => {
    if (!dragged) return;
    const end = () => { dragging.current = false; drag(false); syncCapture(); };
    const block = (e: Event) => e.preventDefault(); // no native link drag or text selection while dragging the card
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    window.addEventListener('dragstart', block, true);
    window.addEventListener('selectstart', block, true);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
      window.removeEventListener('dragstart', block, true);
      window.removeEventListener('selectstart', block, true);
    };
  }, [dragged]);

  /** Fallback if a pointerdown reached the page before the canvas took over: swallow its click. */
  const swallowNextClick = () => {
    const kill = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener('click', kill, { capture: true, once: true });
    const release = () => { setTimeout(() => window.removeEventListener('click', kill, true), 0); };
    window.addEventListener('pointerup', release, { once: true });
    window.addEventListener('pointercancel', release, { once: true });
  };

  useFrame((state, delta) => {
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    const a = getAnchorPx();
    const w = toWorld(a);
    // Only move the kinematic anchor when it actually moved: setNextKinematicTranslation wakes the body, and an
    // awake body makes Rapier invalidate every frame. Kinematic motion doesn't wake sleeping bodies through joints,
    // so wake the chain too.
    // Written as !(<=) so the initial NaN anchor counts as moved (NaN comparisons are always false).
    if (!(Math.abs(a.x - lastAnchor.current.x) <= 0.01 && Math.abs(a.y - lastAnchor.current.y) <= 0.01)) {
      // A sleeping kinematic body ignores its next translation, so wake it first (it may have been put to sleep below).
      [fixed, j1, j2, j3, card].forEach((r) => r.current?.wakeUp());
      fixed.current.setNextKinematicTranslation({ x: w.x, y: w.y, z: 0 });
      lastAnchor.current = a;
      lastActive.current = performance.now();
      // Rapier stepped (and decided whether to invalidate) before this frame callback woke the chain, so request
      // the next frame ourselves; from then on Rapier keeps invalidating while the bodies are awake.
      invalidate();
    }
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    // R3F only re-raycasts hover on real DOM pointer events. When scroll moves the card away from a stationary
    // pointer, replay the last pointer event so onPointerOut fires and the canvas stops capturing.
    if (hovered.current && !dragging.current) state.events.update?.();
    if (dragged) lastActive.current = performance.now();
    const dt = Math.min(delta, 0.1);
    let settling = false;
    [j1, j2].forEach((ref) => {
      const r = ref.current!;
      const t = v(r.translation());
      if (!r.lerped) r.lerped = t.clone();
      const d = Math.max(0.1, Math.min(1, r.lerped.distanceTo(t)));
      r.lerped.lerp(t, Math.min(1, dt * (10 + d * 40)));
      if (r.lerped.distanceTo(t) > 1e-4) settling = true;
    });
    // Keep frames coming while dragging or while the strap smoothing catches up; Rapier covers awake bodies.
    if (dragged || settling) invalidate();
    curve.points[0]!.copy(v(j3.current.translation()));
    curve.points[1]!.copy(j2.current.lerped!);
    curve.points[2]!.copy(j1.current.lerped!);
    curve.points[3]!.copy(v(fixed.current.translation()));
    band.current.geometry.setPoints(curve.getPoints(32));
    // Keep the touch grab area over the card: project its four corners to canvas px and take their bounds.
    const el = grab.current, g = cardGroup.current;
    if (el && g) {
      g.updateWorldMatrix(true, false);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        corner.set((cx * CARD_W) / 2, (cy * CARD_H) / 2, 0).applyMatrix4(g.matrixWorld).project(state.camera);
        const px = ((corner.x + 1) / 2) * size.width, py = ((1 - corner.y) / 2) * size.height;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      const r = { x: x0 - GRAB_PAD, y: y0 - GRAB_PAD, w: x1 - x0 + 2 * GRAB_PAD, h: y1 - y0 + 2 * GRAB_PAD };
      const o = grabRect.current;
      if (Math.abs(r.x - o.x) > 0.5 || Math.abs(r.y - o.y) > 0.5 || Math.abs(r.w - o.w) > 0.5 || Math.abs(r.h - o.h) > 0.5) {
        grabRect.current = r;
        Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      }
    }
    // Ease the card back to facing the camera: damp the y spin by the quaternion's y component.
    const ang = card.current.angvel();
    const rot = card.current.rotation();
    // wakeUp=false: waking the card here every frame (as the original example does) would stop it ever sleeping.
    if (!card.current.isSleeping()) card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z }, false);
    // Rapier's rope joints keep the chain bobbing a few px under gravity, so the bodies never reach its sleep
    // threshold and Rapier would invalidate every frame forever. Once nothing has moved the badge for 2s, put the
    // chain to sleep at a slow, front-facing moment (or after 4s regardless); anchor moves, drags and wake-ups
    // resume it.
    const bodies = [fixed, j1, j2, j3, card];
    const quiet = performance.now() - lastActive.current;
    if (!dragged && quiet > 2000 && bodies.some((r) => !r.current!.isSleeping())) {
      const maxV = Math.max(...[j1, j2, j3, card].map((r) => { const l = r.current!.linvel(); return Math.hypot(l.x, l.y, l.z); }));
      if ((maxV < 0.35 && Math.abs(rot.y) < 0.02) || quiet > 4000) bodies.forEach((r) => r.current!.sleep());
    }
  });

  const { x: sx, y: sy } = start;
  return (
    <>
      <RigidBody ref={fixed} type="kinematicPosition" colliders={false} position={[sx, sy, 0]} />
      <RigidBody position={[sx, sy - SEG, 0]} ref={j1} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 2 * SEG, 0]} ref={j2} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG, 0]} ref={j3} {...seg}><BallCollider args={[0.1]} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG - CLIP_H - CARD_H / 2, 0]} ref={card} {...seg} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.01]} />
        <group
          ref={cardGroup}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent.target !== gl.domElement) { e.nativeEvent.preventDefault(); swallowNextClick(); }
            dragging.current = true; syncCapture(); invalidate();
            drag(new THREE.Vector3().copy(e.point).sub(v(card.current!.translation())));
          }}
          // Touch has no hover: a touch "over" would leave the canvas capturing after the finger lifts (the replay
          // above keeps re-hitting the card at the last touch point), so only mouse/pen hover switches capture on.
          onPointerOver={(e) => { if (e.nativeEvent.pointerType === 'touch') return; hovered.current = true; syncCapture(); lastActive.current = performance.now(); invalidate(); }}
          onPointerOut={() => { hovered.current = false; syncCapture(); invalidate(); }}
        >
          {/* The card: paper-white core with the printed face on both sides. */}
          <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={CARD_R} smoothness={4}>
            <meshStandardMaterial color="#eef0f8" roughness={0.9} metalness={0} envMapIntensity={0.2} />
          </RoundedBox>
          {/* The face is a plane over each flat side: RoundedBox's extruded bevel UVs would smear the texture. */}
          {face && [0, Math.PI].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry ? -FACE_Z : FACE_Z]}>
              <planeGeometry args={[CARD_W - 2 * CARD_R, CARD_H - 2 * CARD_R]} />
              <meshStandardMaterial map={face} roughness={0.9} metalness={0} envMapIntensity={0} />
            </mesh>
          ))}
          {/* Clear plastic sleeve: glossy clearcoat that mostly shows as reflections and edge highlights. */}
          <RoundedBox args={[CARD_W + 2 * SLEEVE_PAD, CARD_H + 2 * SLEEVE_PAD, SLEEVE_D]} radius={CARD_R + SLEEVE_PAD} smoothness={4} renderOrder={1}>
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.05} roughness={0.05} metalness={0} clearcoat={0.6} clearcoatRoughness={0.03} envMapIntensity={0.5} depthWrite={false} />
          </RoundedBox>
          {[0, Math.PI].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry ? -(SLEEVE_D / 2 + 0.002) : SLEEVE_D / 2 + 0.002]} renderOrder={2}>
              <planeGeometry args={[CARD_W + 2 * SLEEVE_PAD, CARD_H + 2 * SLEEVE_PAD]} />
              <meshBasicMaterial map={sheen} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
          {/* Metal clip over the sleeve's top edge and the split ring the strap loops through. */}
          <group position={[0, CARD_H / 2, 0]}>
            <RoundedBox args={[0.22, 0.13, SLEEVE_D + 0.03]} radius={0.025} smoothness={3} position={[0, 0.035, 0]}>
              <meshStandardMaterial color="#d7dbe4" metalness={1} roughness={0.22} />
            </RoundedBox>
            <mesh position={[0, 0.035, SLEEVE_D / 2 + 0.016]}>
              <circleGeometry args={[0.022, 20]} />
              <meshStandardMaterial color="#6b7080" metalness={1} roughness={0.35} />
            </mesh>
            <mesh position={[0, RING_Y - CARD_H / 2, 0]}>
              <torusGeometry args={[RING_R, 0.014, 12, 40]} />
              <meshStandardMaterial color="#e4e7ee" metalness={1} roughness={0.18} />
            </mesh>
          </group>
        </group>
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial color="white" depthTest={false} resolution={[size.width, size.height]} useMap={1} map={strap} repeat={[-ROPE / (STRAP_W * STRAP_TILE_ASPECT), 1]} lineWidth={STRAP_W / Math.tan((fov / 2) * Math.PI / 180)} />
      </mesh>
    </>
  );
}
