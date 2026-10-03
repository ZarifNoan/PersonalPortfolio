import { initials } from '../../lib/initials';

/** HTML/CSS badge (before the first interaction, reduced motion, no WebGL). Mirrors the 3D badge: woven strap with the
 *  label, metal ring and clip, clear sleeve over a card with the same face (textures.ts cardFaceTexture). Styles in
 *  global.css; its total height (410px) equals BadgeIsland's INLINE_H. */
export default function BadgeStatic({ name, role, photo, label }: { name: string; role: string; photo: string | null; label: string }) {
  const words = name.toUpperCase().split(' ');
  return (
    <div className="badge-static" aria-hidden="true">
      <div className="badge-strap"><span>{label}</span></div>
      <div className="badge-hang">
        <div className="badge-ring" />
        <div className="badge-card">
          <div className="badge-clip" />
          <div className="badge-head">
            <span className="badge-slot" />
            <span className="badge-sw">&lt;/&gt;</span><span className="badge-kicker">PORTFOLIO</span><span className="badge-viz">◇</span>
          </div>
          {photo ? <img className="badge-photo" src={photo} alt="" /> : <div className="badge-photo badge-mono">{initials(name)}</div>}
          <div className="badge-name">{words.slice(0, 3).join(' ')}</div>
          <div className="badge-sub">{words.slice(3).join(' ')}</div>
          <div className="badge-role">{role}</div>
          <div className="badge-foot">SOFTWARE · 3D VISUALIZATION</div>
        </div>
      </div>
    </div>
  );
}
