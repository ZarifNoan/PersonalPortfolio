import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, extend, useFrame, useThree, type ThreeElement } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, interactionGroups, useRopeJoint, useSphericalJoint, type RapierRigidBody } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { cardFaceTexture, shadowTexture, SHADOW_PAD, sleeveTexture, strapTexture, STRAP_TILE_ASPECT } from './textures';
import { BADGE } from './face';
import { CAMERA_Z, FOV, SEG, CARD_W, CARD_H, CLIP_H, pxPerWorld } from './anchor';

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

/** The visible badge copies the static one (global.css .badge-card, face.ts BADGE) at the size it hangs on the
 *  reference 1440×900 screen: U world units per static CSS px. So the sleeve is 182 × 294 and the printed face
 *  168 × 280, inset 7, there (the old card showed a ~9px paper rim plus a 50% wider sleeve, the light grey-white frame).
 *  The physics body (CARD_W × CARD_H, anchor.ts) is unchanged; the visuals are centred on it. */
const U = 1 / pxPerWorld(900);
const SLEEVE_W = BADGE.w * U, SLEEVE_H = BADGE.h * U, SLEEVE_R = BADGE.r * U;
const FACE_WW = (BADGE.w - 2 * BADGE.inset) * U, FACE_HW = (BADGE.h - 2 * BADGE.inset) * U, FACE_R = BADGE.faceR * U;
const CARD_D = 0.03, FACE_Z = CARD_D / 2 + 0.002;
/** Clear plastic sleeve around the card; its front texture plane sits just outside it. */
const SLEEVE_D = CARD_D + 0.05, SLEEVE_Z = SLEEVE_D / 2 + 0.002;
/** Size factor that makes a plane z in front of the card's centre project as large as it would at z = 0. */
const persp = (z: number) => (CAMERA_Z - z) / CAMERA_Z;
/** Strap width in world units. meshline's lineWidth is camera-relative (px = lineWidth · viewportH / (2·CAMERA_Z)),
 *  so lineWidth = STRAP_W / tan(fov/2) keeps the same width relative to the card at every FOV. */
const STRAP_W = 0.17;
/** Rope length between the kinematic anchor and the ring (three segments), for the strap texture repeat. */
const ROPE = 3 * SEG;
/** Ring (torus): global.css .badge-ring, 22px across with a 3px band, its centre 8px above the sleeve's top edge. The
 *  strap's end (the joint, CARD_H / 2 + CLIP_H above the centre) overlaps its top by ~3px, as the static strap does. */
const RING_TUBE = 1.5 * U, RING_R = 11 * U - RING_TUBE, RING_Y = SLEEVE_H / 2 + 8 * U;
/** Clip: global.css .badge-clip, 42 × 22 (radius 5) from 9px above the sleeve's top edge, with a 7px rivet. */
const CLIP_W = 42 * U, CLIP_HH = 22 * U, CLIP_Y = SLEEVE_H / 2 + 9 * U - CLIP_HH / 2;

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

/** Up to 2× so the face text is as crisp as the static badge's DOM text on high-DPI screens (it was capped at 1.5×,
 *  which the browser then upscaled). Frames render only while the badge moves. */
export default function Lanyard({ active, fov = FOV, dpr = [1, 2], ...p }: LanyardProps) {
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

/** A rounded-rect slab w × h × d (corner radius r in x/y) with its edges bevelled by b, centred on the origin.
 *  drei's RoundedBox rounds by the same radius in z too, which a 0.03-thick card can't take: with r > d/2 its bevel
 *  folded through the face and showed as a light rim around the printed face. */
function slab(w: number, h: number, r: number, d: number, b = 0) {
  const s = new THREE.Shape(), x = -w / 2 + b, y = -h / 2 + b, W = w - 2 * b, H = h - 2 * b, R = r - b;
  s.moveTo(x + R, y); s.lineTo(x + W - R, y); s.quadraticCurveTo(x + W, y, x + W, y + R);
  s.lineTo(x + W, y + H - R); s.quadraticCurveTo(x + W, y + H, x + W - R, y + H);
  s.lineTo(x + R, y + H); s.quadraticCurveTo(x, y + H, x, y + H - R);
  s.lineTo(x, y + R); s.quadraticCurveTo(x, y, x + R, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

/**
 * Pixel-snaps a front-facing plane of width w and height h (local units) just before it's drawn: shifts it by the
 * sub-pixel remainder of its projected top-left corner, so a 1:1 texture lands on whole device pixels instead of being
 * blurred across two by bilinear filtering (the static badge's DOM text is pixel-aligned). Only while the card faces
 * the camera; the shift is under a pixel, so it can't be seen while the card moves.
 */
const snapV = new THREE.Vector3(), snapQ = new THREE.Quaternion(), bufSize = new THREE.Vector2();
function pixelSnap(w: number, h: number, base: THREE.Vector3Tuple): THREE.Object3D['onBeforeRender'] {
  return function (this: THREE.Object3D, renderer, _scene, camera) {
    const parent = this.parent;
    this.position.set(...base);
    if (parent) {
      parent.getWorldQuaternion(snapQ);
      if (Math.abs(snapQ.x) + Math.abs(snapQ.y) + Math.abs(snapQ.z) < 0.01) {
        renderer.getDrawingBufferSize(bufSize);
        const toPx = () => ({ x: ((snapV.x + 1) / 2) * bufSize.x, y: ((1 - snapV.y) / 2) * bufSize.y });
        snapV.set(base[0] - w / 2, base[1] + h / 2, base[2]).applyMatrix4(parent.matrixWorld).project(camera);
        const p = toPx();
        // Device px per local unit along x and y, measured rather than assumed (perspective, DPR).
        snapV.set(base[0] + w / 2, base[1] - h / 2, base[2]).applyMatrix4(parent.matrixWorld).project(camera);
        const q = toPx();
        const kx = (q.x - p.x) / w, ky = (q.y - p.y) / h;
        if (kx > 0 && ky > 0) this.position.set(base[0] + (Math.round(p.x) - p.x) / kx, base[1] - (Math.round(p.y) - p.y) / ky, base[2]);
      }
    }
    this.updateMatrixWorld();
    // three computes the model-view matrix right after this callback, so the snapped position is what gets drawn.
  };
}

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
  // Device px per static-badge CSS px where the card hangs (z = 0): the face and sleeve canvases are drawn at this
  // scale so they map 1:1 to the screen at rest, like the static badge's DOM. Redrawn when the viewport height or
  // DPR changes it (rounded so sub-pixel resizes don't churn).
  const texScale = Math.max(0.25, Math.round(viewport.factor * viewport.dpr * U * 1000) / 1000);
  const sleeve = useMemo(() => sleeveTexture(texScale), [texScale]);
  const shadow = useMemo(() => shadowTexture(Math.min(texScale, 1)), [texScale]); // a soft blur needs no detail
  const [core] = useState(() => slab(FACE_WW - 3 * U, FACE_HW - 3 * U, FACE_R - 1.5 * U, CARD_D));
  const [shell] = useState(() => slab(SLEEVE_W, SLEEVE_H, SLEEVE_R, SLEEVE_D, 0.02));
  const [facePlace] = useState(() => pixelSnap(FACE_WW * persp(FACE_Z), FACE_HW * persp(FACE_Z), [0, 0, FACE_Z]));
  const [sleevePlace] = useState(() => pixelSnap(SLEEVE_W * persp(SLEEVE_Z), SLEEVE_H * persp(SLEEVE_Z), [0, 0, SLEEVE_Z]));
  // The shell's flat front and back (extrude group 0) are left undrawn: even a 3% white film over the face lifted the
  // ink's black (#0b0b14 read as ~#13131b) and greyed the text. Only its rim (group 1) shows, as a glint when it turns.
  const [shellMats] = useState(() => [
    new THREE.MeshBasicMaterial({ visible: false }),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.04, roughness: 0.05, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.03, envMapIntensity: 0.5, depthWrite: false }),
  ]);
  useEffect(() => () => { core.dispose(); shell.dispose(); shellMats.forEach((m) => m.dispose()); }, [core, shell, shellMats]);

  const faceDrawn = useRef(false);
  useEffect(() => {
    let live = true;
    const draw = () => cardFaceTexture(name, role, photo, label, texScale).then((t) => { if (live) { faceDrawn.current = true; setFace(t); } else t.dispose(); });
    // The first face is needed before the scene can show; later redraws (resizes) wait for the resize to finish.
    const timer = faceDrawn.current ? setTimeout(draw, 200) : (draw(), undefined);
    return () => { live = false; clearTimeout(timer); };
  }, [name, role, photo, label, texScale]);
  useEffect(() => () => { face?.dispose(); }, [face]);
  useEffect(() => () => { strap.dispose(); }, [strap]);
  useEffect(() => () => { sleeve.dispose(); }, [sleeve]);
  useEffect(() => () => { shadow.dispose(); }, [shadow]);
  // Wait for the face texture so the swap from the static badge never shows a blank card.
  useEffect(() => { if (face) onReady?.(); }, [face, onReady]);

  const seg = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
  // The colliders only give the bodies mass: they collide with nothing. When the anchor jumped (an instant scroll) the
  // card could land on a rope bead and stay wedged there, hanging ~150px short.
  const ghost = interactionGroups(0, []);
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
        corner.set((cx * SLEEVE_W) / 2, (cy * SLEEVE_H) / 2, 0).applyMatrix4(g.matrixWorld).project(state.camera);
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
      <RigidBody position={[sx, sy - SEG, 0]} ref={j1} {...seg}><BallCollider args={[0.1]} collisionGroups={ghost} /></RigidBody>
      <RigidBody position={[sx, sy - 2 * SEG, 0]} ref={j2} {...seg}><BallCollider args={[0.1]} collisionGroups={ghost} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG, 0]} ref={j3} {...seg}><BallCollider args={[0.1]} collisionGroups={ghost} /></RigidBody>
      <RigidBody position={[sx, sy - 3 * SEG - CLIP_H - CARD_H / 2, 0]} ref={card} {...seg} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <CuboidCollider args={[CARD_W / 2, CARD_H / 2, 0.01]} collisionGroups={ghost} />
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
          {/* The static card's drop shadow (box-shadow 0 30px 60px), behind the card. Front side only, so it vanishes
              when the card turns its back; never raycast, so it can't widen the hover/click-capture area. */}
          <mesh position={[0, -((SHADOW_PAD.bottom - SHADOW_PAD.top) / 2) * U, -SLEEVE_D / 2 - 0.01]} renderOrder={-1} raycast={() => null}>
            <planeGeometry args={[(BADGE.w + 2 * SHADOW_PAD.side) * U, (BADGE.h + SHADOW_PAD.top + SHADOW_PAD.bottom) * U]} />
            <meshBasicMaterial map={shadow} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          {/* The card: a paper core (its edge shows when the card turns) with the printed face on both sides. Inset
              1.5px so its side wall doesn't peek out past the face in perspective while the card hangs off-centre. */}
          <mesh geometry={core}>
            <meshStandardMaterial color="#eef0f8" roughness={0.9} metalness={0} envMapIntensity={0.2} />
          </mesh>
          {/* The face is a plane over each flat side. Its size is scaled down by its depth in front of z = 0 so it
              projects at exactly the texture's 1:1 size, and the front one is pixel-snapped as it's drawn. */}
          {face && [0, Math.PI].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry ? -FACE_Z : FACE_Z]} onBeforeRender={ry ? undefined : facePlace}>
              <planeGeometry args={[FACE_WW * persp(FACE_Z), FACE_HW * persp(FACE_Z)]} />
              {/* Unlit and not tone-mapped: the printed face shows the canvas colours exactly (lighting and ACES greyed
                  the ink and paled the role line). Transparent only for its rounded corners. */}
              <meshBasicMaterial map={face} transparent toneMapped={false} />
            </mesh>
          ))}
          {/* Clear plastic sleeve: a barely-there glossy shell whose reflections shade its edges as the card turns.
              From the front it looks like the static badge's: the plane below draws its frame, light edge and glare
              from the same CSS, over the dark page. */}
          <mesh geometry={shell} material={shellMats} renderOrder={1} />
          {[0, Math.PI].map((ry) => (
            <mesh key={ry} rotation={[0, ry, 0]} position={[0, 0, ry ? -SLEEVE_Z : SLEEVE_Z]} renderOrder={2} onBeforeRender={ry ? undefined : sleevePlace}>
              <planeGeometry args={[SLEEVE_W * persp(SLEEVE_Z), SLEEVE_H * persp(SLEEVE_Z)]} />
              <meshBasicMaterial map={sleeve} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
          {/* Metal ring the strap loops through, and the clip over the sleeve's top edge. Drawn after the strap (the
              strap ignores depth, so whatever draws after it covers it), so the strap's end tucks behind the ring, as
              in the static badge. Satin rather than mirror metal: the static clip is a soft
              light-to-mid grey gradient, and a mirror finish showed the dark room as black edges. */}
          <mesh position={[0, RING_Y, 0]} renderOrder={5}>
            <torusGeometry args={[RING_R, RING_TUBE, 12, 40]} />
            <meshStandardMaterial color="#e4e7ee" metalness={0.7} roughness={0.3} />
          </mesh>
          <group position={[0, CLIP_Y, 0]}>
            <RoundedBox args={[CLIP_W, CLIP_HH, SLEEVE_D + 0.03]} radius={5 * U} smoothness={3} renderOrder={6}>
              <meshStandardMaterial color="#b1b7c3" metalness={0.85} roughness={0.35} />
            </RoundedBox>
            <mesh position={[0, 0, SLEEVE_D / 2 + 0.016]} renderOrder={7}>
              <circleGeometry args={[3.5 * U, 20]} />
              <meshBasicMaterial color="#6b7080" toneMapped={false} />
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
