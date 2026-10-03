import { initials } from '../../lib/initials';

export default function BadgeStatic({ name, role, photo }: { name: string; role: string; photo: string | null }) {
  return (
    <div className="badge-static" aria-hidden="true">
      <div className="badge-strap" />
      <div className="badge-card">
        <div className="badge-clip" />
        {photo ? <img className="badge-photo" src={photo} alt="" /> : <div className="badge-photo badge-mono">{initials(name)}</div>}
        <div className="badge-name">{name.split(' ').slice(0, 3).join(' ').toUpperCase()}</div>
        <div className="badge-role">{role}</div>
      </div>
    </div>
  );
}
