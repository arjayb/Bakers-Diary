import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../api/client';

export default function JournalEntry() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getJournalEntry(sessionId)
      .then((res) => setSession(res.session))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;
  if (error || !session) return <div className="page-content"><div className="alert alert-error">{error || 'Not found'}</div></div>;

  return (
    <div className="page-content">
      <Link to="/journal" className="muted" style={{ color: 'var(--rose)' }}>← Back to Journal</Link>

      <div className="card" style={{ marginTop: 'var(--space-3)' }}>
        {session.finalPhoto && <img src={session.finalPhoto.url} alt="" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />}
        <p className="eyebrow">{session.recipe.title} · Bake #{session.bakeNumber}</p>
        <h1>{session.status === 'completed' ? 'Completed Bake' : 'Bake Notes'}</h1>
        {session.rating && <p style={{ color: 'var(--gold)', fontSize: '1.2rem' }}>{'★'.repeat(session.rating)}{'☆'.repeat(5 - session.rating)}</p>}
        {session.finalNotes && <p>{session.finalNotes}</p>}
        {session.whatToChangeNextTime && (
          <div style={{ background: 'var(--gold-soft)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
            <strong style={{ color: 'var(--gold)', fontSize: '0.82rem' }}>Next time:</strong>
            <p style={{ margin: 0 }}>{session.whatToChangeNextTime}</p>
          </div>
        )}
      </div>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2>Step-by-step</h2>
        <div className="step-list">
          {session.steps.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 4 }}>
                <span className="step-marker done">{s.completed ? '✓' : s.recipeStep.order}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{s.recipeStep.instruction}</strong>
              </div>
              {s.notes && <p style={{ marginLeft: 34 }}>{s.notes}</p>}
              {s.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginLeft: 34, flexWrap: 'wrap' }}>
                  {s.photos.map((p) => <img key={p.id} src={p.url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
