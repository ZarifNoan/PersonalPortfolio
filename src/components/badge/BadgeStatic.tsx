import { initials } from '../../lib/initials';
import { roleLines } from '../../lib/badgeText';

/** HTML/CSS badge (before the first interaction, reduced motion, no WebGL). Mirrors the 3D badge: woven strap with the
 *  label, metal ring and clip, clear sleeve over a card whose face copies textures.ts cardFaceTexture line for line
 *  (face.ts FACE: the photo full-bleed between the header and footer bands, or the monogram when there is no photo,
 *  under a white fade with the role). Styles in global.css; its height is --badge-strap + --badge-body. */
export default function BadgeStatic({ name, role, photo, label }: { name: string; role: string; photo: string | null; label: string }) {
  return (
    <div className="badge-static" aria-hidden="true">
      <div className="badge-strap"><span>{label}</span></div>
      <div className="badge-hang">
        <div className="badge-ring" />
        <div className="badge-card">
          <div className="badge-clip" />
          <div className="badge-face">
            <div className="badge-head"><span className="badge-slot" /><span className="badge-sw">&lt;/&gt;</span><span className="badge-viz">◇</span></div>
            {photo ? <img className="badge-photo" src={photo} alt="" decoding="async" /> : <div className="badge-photo badge-mono">{initials(name)}</div>}
            <div className="badge-fade" />
            <div className="badge-role">{roleLines(role).map((l, i) => <span key={i}>{l}</span>)}</div>
            <div className="badge-foot">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
