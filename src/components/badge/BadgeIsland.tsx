import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import BadgeStatic from './BadgeStatic';
import { badgeAnchor, CARD_W, cardDropPx, pxPerWorld, TOP_OFFSET } from './anchor';

const Lanyard = lazy(() => import('./Lanyard'));
type Mode = 'static' | '3d-travel' | '3d-inline';
// Narrower than the travel scene's FOV so rope + card fill most of the inline canvas.
const INLINE_FOV = 15;
/** Inline (mobile) canvas height: the static badge's height (120px strap + 210×1.4 card − 4px overlap), so swapping
 *  one for the other doesn't shift the page. Hero.astro's mobile slot min-height matches. */
const INLINE_H = 410;
/** The inline canvas is small (≤ ~900×410 CSS px) and renders only while the badge moves, so it can afford up to 2× for
 *  a crisp card face on phones (it was [1, 1], which blurred the redesigned face text). Lighthouse never mounts it. */
const INLINE_DPR: [number, number] = [1, 2];
type Props = { name: string; role: string; photo: string | null; label: string };

let webglCached: boolean | undefined;
/** Probes WebGL once per page load and releases the probe context (browsers cap live contexts). */
function webglOk(): boolean {
  if (webglCached !== undefined) return webglCached;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    webglCached = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { webglCached = false; }
  return webglCached;
}

class Boundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function BadgeIsland(props: Props) {
  const [mode, setMode] = useState<Mode>('static');
  // The 3D scene (three.js + Rapier WASM, a few seconds of main-thread work on mobile) only loads after the first
  // real interaction. Until then the static badge, with its CSS sway, stays.
  const [engaged, setEngaged] = useState(false);
  const [active, setActive] = useState(true);
  // Which mode's scene has finished loading; switching mode remounts the scene, so readiness is per mode.
  const [readyMode, setReadyMode] = useState<Mode | null>(null);
  const ready = readyMode === mode;
  const broken = useRef(false);
  const inlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const events = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'] as const;
    const off = () => events.forEach((e) => removeEventListener(e, on, true));
    const on = () => { off(); setEngaged(true); };
    events.forEach((e) => addEventListener(e, on, { capture: true, passive: true }));
    return off;
  }, []);

  useEffect(() => {
    if (!engaged) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const wide = matchMedia('(min-width: 900px)');
    const decide = () => {
      const next: Mode = broken.current || reduce.matches || !webglOk() ? 'static' : wide.matches ? '3d-travel' : '3d-inline';
      setMode(next);
    };
    decide();
    reduce.addEventListener('change', decide); wide.addEventListener('change', decide);
    return () => { reduce.removeEventListener('change', decide); wide.removeEventListener('change', decide); };
  }, [engaged]);

  // Pause rendering when the tab is hidden or the badge is off-screen: in travel mode once About Me (which the card
  // leaves with) has scrolled off the top, in inline mode once the inline box has left the viewport.
  useEffect(() => {
    const check = () => {
      let onScreen = true;
      if (mode === '3d-travel') {
        const about = document.querySelector('[data-badge-release]')?.getBoundingClientRect();
        onScreen = !about || about.bottom > 0;
      } else if (mode === '3d-inline' && inlineRef.current) {
        const r = inlineRef.current.getBoundingClientRect();
        onScreen = r.bottom > 0 && r.top < innerHeight;
      }
      setActive(!document.hidden && onScreen);
    };
    check();
    addEventListener('scroll', check, { passive: true });
    document.addEventListener('visibilitychange', check);
    return () => { removeEventListener('scroll', check); document.removeEventListener('visibilitychange', check); };
  }, [mode]);

  const onReady = useCallback(() => setReadyMode(mode), [mode]);
  // A runtime WebGL/physics failure drops to the static badge for the rest of the visit.
  const onError = useCallback(() => { broken.current = true; setMode('static'); }, []);

  const staticBadge = <BadgeStatic {...props} />;
  // The canvas and static badge are aria-hidden; this is the same name and role as real text, in every mode.
  const srText = <span className="visually-hidden">{props.name}, {props.role}</span>;
  const gate = engaged ? '' : undefined; // data-engaged: the interaction gate has opened (used by tests)

  const getTravelAnchor = useCallback(() => {
    const hero = document.querySelector('[data-badge-anchor="hero"]')?.getBoundingClientRect();
    const about = document.querySelector('[data-badge-release]')?.getBoundingClientRect();
    if (!hero || !about) return { x: innerWidth * 0.75, y: TOP_OFFSET };
    // Hang in the right margin beside About Me: nudge right of the slot centre so the card clears the text column.
    const half = (CARD_W / 2) * pxPerWorld(innerHeight);
    const avoid = document.querySelector('[data-badge-avoid]')?.getBoundingClientRect();
    let heroX = hero.left + hero.width / 2;
    if (avoid) heroX = Math.min(Math.max(heroX, avoid.right + half + 32), Math.max(heroX, hero.right - half));
    return badgeAnchor({ heroX, aboutBottom: about.bottom, drop: cardDropPx(innerHeight) });
  }, []);
  const getInlineAnchor = useCallback(() => {
    const el = inlineRef.current;
    return { x: (el?.clientWidth ?? 0) / 2, y: TOP_OFFSET };
  }, []);

  if (mode === 'static') return <div data-badge-mode="static" data-engaged={gate}>{srText}{staticBadge}</div>;

  // The static badge stays in the slot until the scene is ready, so there's no empty gap while three.js/rapier load.
  const scene = (
    <Boundary fallback={null} onError={onError}>
      <Suspense fallback={null}>
        <Lanyard {...props} active={active} onReady={onReady} fov={mode === '3d-travel' ? undefined : INLINE_FOV} dpr={mode === '3d-travel' ? undefined : INLINE_DPR} getAnchorPx={mode === '3d-travel' ? getTravelAnchor : getInlineAnchor} />
      </Suspense>
    </Boundary>
  );

  return mode === '3d-travel'
    ? (
      <div data-badge-mode="3d-travel" data-engaged={gate}>
        {srText}
        {!ready && staticBadge}
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none', visibility: ready ? 'visible' : 'hidden' }}>{scene}</div>
      </div>
    )
    : (
      <div data-badge-mode="3d-inline" data-engaged={gate} ref={inlineRef} style={{ position: 'relative', width: '100%', height: INLINE_H }}>
        {srText}
        {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}>{staticBadge}</div>}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, visibility: ready ? 'visible' : 'hidden' }}>{scene}</div>
      </div>
    );
}
