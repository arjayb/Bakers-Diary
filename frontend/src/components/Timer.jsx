import { useEffect, useRef, useState } from 'react';

/**
 * §15 timer requirements, and their honest limits:
 * - create/start, pause/resume/reset: implemented.
 * - "persist sufficient timer state so a refresh does not blindly reset a
 *   running timer": implemented by storing an absolute end-timestamp in
 *   localStorage (keyed by `storageKey`) rather than a countdown int — on
 *   remount, remaining time is recomputed from Date.now() vs. that
 *   timestamp, so a refresh mid-countdown resumes correctly.
 * - What this does NOT do, honestly: fire a native background alarm if the
 *   browser tab is closed or the device is asleep. The Notification API
 *   requires the page to still be loaded (even if backgrounded) — a fully
 *   closed tab means the timer state is preserved (the end-timestamp is in
 *   localStorage) but nothing will alert Chef Kats until she reopens the
 *   app, at which point an already-elapsed timer just shows 00:00 /
 *   "Done" rather than claiming it rang on time. See §15 in the spec:
 *   "Do not claim native-background-alarm behavior that the web platform
 *   does not actually provide" — this comment exists so nobody "fixes"
 *   this into a false claim later.
 */
export function useStepTimer(storageKey, durationSeconds) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { endsAt, pausedRemaining } = JSON.parse(saved);
      if (endsAt) {
        const secsLeft = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
        setRemaining(secsLeft);
        setRunning(secsLeft > 0);
      } else if (pausedRemaining !== undefined) {
        setRemaining(pausedRemaining);
        setRunning(false);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          localStorage.removeItem(storageKey);
          if (Notification?.permission === 'granted') {
            // Best-effort only — see the honesty note above.
            try { new Notification('Baker\'s Diary', { body: 'Timer done!' }); } catch { /* no-op if unsupported */ }
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, storageKey]);

  function start() {
    const endsAt = Date.now() + remaining * 1000;
    localStorage.setItem(storageKey, JSON.stringify({ endsAt }));
    if (Notification && Notification.permission === 'default') Notification.requestPermission();
    setRunning(true);
  }

  function pause() {
    setRunning(false);
    localStorage.setItem(storageKey, JSON.stringify({ pausedRemaining: remaining }));
  }

  function reset() {
    setRunning(false);
    setRemaining(durationSeconds);
    localStorage.removeItem(storageKey);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return { remaining, running, start, pause, reset, label: `${mm}:${ss}` };
}

export function Timer({ storageKey, durationSeconds }) {
  const { running, start, pause, reset, label, remaining } = useStepTimer(storageKey, durationSeconds);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" className="timer-badge" onClick={running ? pause : start}>
        <span aria-hidden="true">{running ? '⏸' : '▶'}</span> {label}
      </button>
      {(running || remaining !== durationSeconds) && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Reset</button>
      )}
    </div>
  );
}
