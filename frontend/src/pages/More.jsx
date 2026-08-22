import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function More() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <div className="page-content">
      <h1>More</h1>

      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2>Appearance</h2>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-primary)' }}>Day Kitchen ☀️ / Night Kitchen 🌙</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${theme === 'day' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTheme('day')} type="button">☀️ Day</button>
            <button className={`btn btn-sm ${theme === 'night' ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTheme('night')} type="button">🌙 Night</button>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2>Tools</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Link to="/converter" className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>⇄ Unit Converter</Link>
          <Link to="/groceries" className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>🛒 Grocery List</Link>
          <Link to="/nutrition" className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>📊 Nutrition</Link>
          <Link to="/dedication?replay=1" className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>♥ Revisit the Dedication</Link>
        </div>
      </section>

      <section>
        <h2>Preferences</h2>
        <DedicationToggle />
      </section>

      <button className="btn btn-danger btn-block" style={{ marginTop: 'var(--space-6)' }} onClick={signOut} type="button">Log out</button>
    </div>
  );
}

// Local, self-contained hook + component — kept in this file rather than a
// shared one since it's a single-use toggle tied to this page (§33: avoid
// over-abstracting a one-off into a shared module).
function useEnabledDedication() {
  const [enabled, setEnabledState] = useState(true);
  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.settings) setEnabledState(res.settings.showDedicationOnLogin);
    }).catch(() => {});
  }, []);
  function setEnabled(value) {
    setEnabledState(value);
    api.updateSettings({ showDedicationOnLogin: value }).catch(() => {});
  }
  return [enabled, setEnabled];
}

function DedicationToggle() {
  const [enabled, setEnabled] = useEnabledDedication();
  return (
    <label className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
      <span style={{ color: 'var(--text-primary)' }}>Show dedication after login</span>
      <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ width: 20, height: 20 }} />
    </label>
  );
}
