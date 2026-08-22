import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';

export default function Journal() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getJournal()
      .then((res) => setSessions(res.sessions || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <h1>My Journal</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {sessions.length === 0 ? (
        <div className="empty-state card">
          <p>No Bakes in your Journal yet. Complete a Bake and it'll show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {sessions.map((s) => (
            <Link to={`/journal/${s.id}`} key={s.id} className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', textDecoration: 'none' }}>
              <div className="cover" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', flexShrink: 0, backgroundImage: (s.finalPhoto || s.recipe.coverImage) ? `url(${(s.finalPhoto || s.recipe.coverImage).url})` : undefined }}>
                {!(s.finalPhoto || s.recipe.coverImage) && '🍰'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.recipe.title} — Bake #{s.bakeNumber}</div>
                <div className="muted">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'Abandoned'}</div>
              </div>
              {s.rating && <span style={{ color: 'var(--gold)' }}>{'★'.repeat(s.rating)}</span>}
              {s.status === 'abandoned' && <span className="badge badge-rose">Not finished</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
