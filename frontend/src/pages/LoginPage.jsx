import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(password);
      navigate('/dedication', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong signing in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    try {
      await api.forgotPassword();
    } catch (err) {
      setForgotMessage(err.message);
    }
  }

  return (
    <main className="login-page">
      <div className="login-atmosphere" />

      <section className="login-shell">
        <header className="login-brand">
          <div className="login-emblem" aria-hidden="true">
            ♡
          </div>

          <h1 className="login-wordmark">Baker's Diary</h1>

          <div className="login-divider" aria-hidden="true">
            <span />
            <b>♡</b>
            <span />
          </div>

          <p className="login-tagline">
            Your Recipes. Your Journey.
            <br />
            Your Story.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="login-card">
          <h2>Welcome back!</h2>

          <p className="login-intro">
            Enter your password to access your diary.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="password">Password</label>

            <div className="input-with-icon login-password">
              <span className="login-lock" aria-hidden="true">♙</span>

              <input
                id="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                autoFocus
                required
              />

              <button
                type="button"
                className="input-icon-btn right"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '◉' : '◎'}
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block login-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Unlocking…' : 'Unlock My Diary'}
          </button>

          <div className="login-forgot">
            <button
              type="button"
              onClick={handleForgot}
              className="login-forgot-button"
            >
              Forgot password?
            </button>

            {forgotMessage && (
              <p className="muted login-forgot-message">
                {forgotMessage}
              </p>
            )}
          </div>
        </form>

        <footer className="login-footer">
          <span>♥</span>
          <p>
            Made with love for every recipe
            <br />
            and every memory.
          </p>
        </footer>
      </section>
    </main>
  );
}
