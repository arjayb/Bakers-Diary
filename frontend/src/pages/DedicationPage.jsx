import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../api/client';

export default function DedicationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const replay = searchParams.get('replay') === '1';

  useEffect(() => {
    if (replay) {
      setLoading(false);
      return;
    }

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

  if (loading) {
    return (
      <div className="center-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <main className="dedication-page">
      <div className="dedication-glow" />

      <section className="dedication-shell">
        <header className="dedication-header">
          <p className="dedication-kicker">Welcome back,</p>

          <h1 className="dedication-name">
            Chef Kats <span aria-hidden="true">♥</span>
          </h1>

          <p className="dedication-subtitle">
            So happy to have you here!
          </p>

          <div className="dedication-divider" aria-hidden="true">
            <span />
            <b>♥</b>
            <span />
          </div>
        </header>

        <blockquote className="dedication-card">
          <div className="dedication-quote-mark">“</div>

          <p>
            A recipe is just the beginning.
            The real magic happens in the mix
            of your heart, your hands, and your story.
          </p>

          <footer>— Chef Kats ♥</footer>
        </blockquote>

        <div className="dedication-visual" aria-hidden="true">
          <div className="dedication-bowl" />
          <div className="dedication-whisk" />
        </div>

        <button
          className="btn btn-gold dedication-enter"
          onClick={() => navigate('/dashboard', { replace: true })}
        >
          {replay ? 'Back to Dashboard' : 'Enter My Diary'}
        </button>
      </section>
    </main>
  );
}
