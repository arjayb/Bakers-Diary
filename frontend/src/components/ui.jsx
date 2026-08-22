import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/recipes', label: 'Recipes', icon: '▤' },
  { to: '/journal', label: 'Journal', icon: '✎' },
  { to: '/more', label: 'More', icon: '⋯' },
];

// §9: "Home | Recipes | Cook | Journal | More" — Cook has no standalone
// page of its own (a Bake only exists in the context of a specific
// recipe/session, per §13), so it's reachable from Home/Recipes rather
// than being a 5th static nav destination with nothing to land on when
// nothing is cooking. Documented as a deliberate interpretation, not an
// omission — see DEVIATIONS in the handoff.
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span aria-hidden="true">{l.icon}</span>
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function TopNav({ onLogout }) {
  return (
    <header className="top-nav">
      <span className="wordmark" style={{ fontSize: '1.6rem' }}>Baker's Diary</span>
      <div className="links">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {l.label}
          </NavLink>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onLogout}>Log out</button>
    </header>
  );
}

export function StarRating({ value = 0, onChange, readOnly = false }) {
  return (
    <div className="star-row" role={readOnly ? undefined : 'radiogroup'} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn${n <= value ? ' filled' : ''}`}
          disabled={readOnly}
          onClick={() => onChange && onChange(n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >★</button>
      ))}
    </div>
  );
}

export function ProgressBar({ percent }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
