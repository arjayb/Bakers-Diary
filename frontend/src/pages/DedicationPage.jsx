import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../api/client';

export default function DedicationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const replay = searchParams.get('replay') === '1'; // §8: "must remain accessible elsewhere" — Settings links here with ?replay=1

  useEffect(() => {
    if (replay) { setLoading(false); return; }
    api.getSettings()
      .then((res) => {
        if (res.settings && res.settings.showDedicationOnLogin === false) {
          navigate('/dashboard', { replace: true });
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [navigate, replay]);

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: 'var(--space-5)' }}>
      <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
        <p className="muted">Welcome back,</p>
        <p className="wordmark" style={{ fontSize: '2.4rem' }}>Chef Kats ♥</p>
        <p style={{ marginBottom: 'var(--space-5)' }}>So happy to have you here!</p>

        <blockquote style={{ margin: '0 0 var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
            "A recipe is just the beginning. The real magic happens in the mix of your heart, your hands, and your story."
          </p>
          <span className="wordmark" style={{ fontSize: '1.3rem' }}>— Chef Kats ♥</span>
        </blockquote>

        <button className="btn btn-gold btn-block" onClick={() => navigate('/dashboard', { replace: true })}>
          {replay ? 'Back to Dashboard' : "Enter My Diary"}
        </button>
      </div>
    </div>
  );
}
