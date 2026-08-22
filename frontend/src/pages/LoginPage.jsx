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
      // §8: first-use flow goes through Dedication; App.jsx's dedication
      // gate decides that based on settings, so login always lands on
      // /dedication and lets that page decide whether to show or skip.
      const dest = location.state?.from?.pathname || '/dedication';
      navigate(dest, { replace: true });
    } catch (err) {
      // §34 "wrong password" failure state
      setError(err.message || 'Something went wrong signing in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    try {
      await api.forgotPassword();
    } catch (err) {
      // §7: honestly disabled — the message IS the feature for v0.1.
      setForgotMessage(err.message);
    }
  }

  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', padding: 'var(--space-5)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <p className="wordmark">Baker's Diary</p>
        <p className="eyebrow" style={{ marginTop: 'var(--space-2)' }}>Your Recipes. Your Journey. Your Story.</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: 380 }}>
        <h2>Welcome back!</h2>
        <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>Enter your password to access your diary.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-with-icon">
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
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Unlocking…' : 'Unlock My Diary'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <button type="button" onClick={handleForgot} className="btn-ghost" style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.85rem' }}>
            Forgot password?
          </button>
          {forgotMessage && <p className="muted" style={{ marginTop: 'var(--space-2)' }}>{forgotMessage}</p>}
        </div>
      </form>

      <p className="muted" style={{ marginTop: 'var(--space-6)' }}>♥ Made with love for every recipe and every memory.</p>
    </div>
  );
}
