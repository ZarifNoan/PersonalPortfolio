import { initials } from '../../lib/initials';
import { faceLines } from '../../lib/badgeText';

/** HTML/CSS badge (before the first interaction, reduced motion, no WebGL). Mirrors the 3D badge: woven strap with the
 *  label, metal ring and clip, clear sleeve over a card whose face copies textures.ts cardFaceTexture line for line
 *  (same faceLines breaks; positions and sizes in container units). Styles in global.css; its height is
 *  --badge-strap + --badge-body. */
export default function BadgeStatic({ name, role, photo, label }: { name: string; role: string; photo: string | null; label: string }) {
  const lines = faceLines(name, role);
  return (
    <div className="badge-static" aria-hidden="true">
      <div className="badge-strap"><span>{label}</span></div>
      <div className="badge-hang">
        <div className="badge-ring" />
        <div className="badge-card">
          <div className="badge-clip" />
          <div className="badge-face">
            <div className="badge-head"><span className="badge-slot" /><span className="badge-sw">&lt;/&gt;</span><span className="badge-viz">◇</span></div>
            {photo ? <img className="badge-photo" src={photo} alt="" /> : <div className="badge-photo badge-mono">{initials(name)}</div>}
            <div className="badge-name">{lines.name.map((l, i) => <span key={i}>{i ? ' ' : ''}{l}</span>)}</div>
            {lines.sub && <div className="badge-sub">{lines.sub}</div>}
            <div className="badge-rule" />
            <div className="badge-role">{lines.role.map((l, i) => <span key={i}>{i ? <i> · </i> : null}{l}</span>)}</div>
            <div className="badge-foot">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
