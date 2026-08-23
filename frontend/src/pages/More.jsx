import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function More() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function exportOfflineData() {
    setExporting(true);
    setExportError('');
    try {
      const token = localStorage.getItem('bd_token');
      if (!token) throw new Error('Please log in again before exporting.');
      const base = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')).replace(/\/$/, '');
      const response = await fetch(`${base}/export/offline`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        let message = `Export failed (${response.status})`;
        try { const body = await response.json(); if (body?.message) message = body.message; } catch {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `bakers-diary-offline-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

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

      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h2>Offline APK Migration</h2>
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>Download a read-only snapshot of your current recipes, bake history, groceries, settings, and media references for the offline Android edition.</p>
          <button className="btn btn-gold btn-block" type="button" disabled={exporting} onClick={exportOfflineData}>{exporting ? 'Preparing export…' : 'Export for Offline APK'}</button>
          {exportError && <div className="alert alert-error" style={{ marginTop: 'var(--space-3)' }}>{exportError}</div>}
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
