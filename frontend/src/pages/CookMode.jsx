import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import { Timer } from '../components/Timer';
import { PhotoUpload } from '../components/PhotoUpload';
import { StarRating } from '../components/ui';

export default function CookMode() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStepId, setActiveStepId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const load = useCallback(() => {
    return api.getSession(sessionId).then((res) => {
      setSession(res.session);
      const current = res.session.steps.find((s) => s.recipeStep.order === res.session.currentStepOrder) || res.session.steps[0];
      setActiveStepId(current?.id);
      setNotesDraft(current?.notes || '');
      if (res.session.status === 'completed') setShowSummary(true);
    });
  }, [sessionId]);

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [load]);

  const activeStep = session?.steps.find((s) => s.id === activeStepId);

  function goToStep(step) {
    setActiveStepId(step.id);
    setNotesDraft(step.notes || '');
    // §14 autosave: navigating steps IS progress, saved immediately, not
    // gated behind an explicit Save button.
    api.updateSessionProgress(sessionId, { currentStepOrder: step.recipeStep.order }).catch(() => {});
  }

  async function toggleComplete(step) {
    try {
      const res = await api.updateSessionProgress(sessionId, {
        stepUpdates: [{ sessionStepId: step.id, completed: !step.completed }],
      });
      setSession(res.session);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveNotes() {
    if (!activeStep) return;
    setSavingNotes(true);
    try {
      const res = await api.updateSessionProgress(sessionId, {
        stepUpdates: [{ sessionStepId: activeStep.id, notes: notesDraft }],
      });
      setSession(res.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function attachPhoto(asset) {
    try {
      const res = await api.attachStepPhoto(sessionId, { sessionStepId: activeStep.id, mediaAssetId: asset.id });
      setSession(res.session);
    } catch (err) {
      setError(err.message);
    }
  }

  function goPrev() {
    const idx = session.steps.findIndex((s) => s.id === activeStepId);
    if (idx > 0) goToStep(session.steps[idx - 1]);
  }
  function goNext() {
    const idx = session.steps.findIndex((s) => s.id === activeStepId);
    if (idx < session.steps.length - 1) goToStep(session.steps[idx + 1]);
    else setShowSummary(true); // last step's Next opens Bake Summary (§18)
  }

  async function handleAbandon() {
    if (!window.confirm("Leave this Bake? It'll stay under Continue Your Journey so you can pick it back up later.")) return;
    try {
      await api.abandonSession(sessionId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;
  if (error && !session) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;
  if (!session) return null;

  if (showSummary) {
    return <BakeSummary session={session} onSaved={() => navigate('/journal')} onBack={() => setShowSummary(false)} />;
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{session.recipe.title}</h1>
          <p className="muted">Bake #{session.bakeNumber}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleAbandon}>Leave Bake</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="cook-layout">
        {/* §13: sequential guidance shown as a progression list, but every
            step is directly clickable — "sequential guidance, not
            sequential imprisonment." */}
        <div className="step-list card">
          {session.steps.map((s) => {
            const isActive = s.id === activeStepId;
            return (
              <button key={s.id} className={`step-list-item${isActive ? ' active' : ''}`} onClick={() => goToStep(s)} type="button">
                <span className={`step-marker${s.completed ? ' done' : isActive ? ' current' : ''}`}>
                  {s.completed ? '✓' : s.recipeStep.order}
                </span>
                <span>{s.recipeStep.instruction.slice(0, 40)}{s.recipeStep.instruction.length > 40 ? '…' : ''}</span>
              </button>
            );
          })}
        </div>

        {activeStep && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <p className="eyebrow">Step {activeStep.recipeStep.order} of {session.steps.length}</p>
              {activeStep.recipeStep.timerSeconds && (
                <Timer storageKey={`bd-timer-${activeStep.id}`} durationSeconds={activeStep.recipeStep.timerSeconds} />
              )}
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>{activeStep.recipeStep.instruction}</p>

            {activeStep.recipeStep.referenceImage && (
              <img src={activeStep.recipeStep.referenceImage.url} alt="" style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
            )}

            <div className="field">
              <label>Notes</label>
              <textarea className="input" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} onBlur={saveNotes} placeholder="Add a little extra cinnamon today. Smells amazing!" />
              {savingNotes && <span className="muted">Saving…</span>}
            </div>

            <div className="field">
              <label>Photos</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                {activeStep.photos?.map((p) => (
                  <img key={p.id} src={p.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ))}
              </div>
              <PhotoUpload onUploaded={attachPhoto} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
              <input type="checkbox" checked={activeStep.completed} onChange={() => toggleComplete(activeStep)} style={{ width: 20, height: 20 }} />
              <span style={{ color: 'var(--text-primary)' }}>Mark this step done</span>
            </label>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-ghost" onClick={goPrev} disabled={session.steps[0].id === activeStepId} type="button">Previous</button>
              <button className="btn btn-primary" onClick={goNext} type="button">
                {session.steps[session.steps.length - 1].id === activeStepId ? 'Complete Bake' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// §18: Final Step -> Complete Bake -> Bake Summary -> Save to Journal
function BakeSummary({ session, onSaved, onBack }) {
  const [finalPhoto, setFinalPhoto] = useState(session.finalPhoto || null);
  const [notes, setNotes] = useState(session.finalNotes || '');
  const [rating, setRating] = useState(session.rating || 0);
  const [nextTime, setNextTime] = useState(session.whatToChangeNextTime || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const alreadyCompleted = session.status === 'completed';

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.completeSession(session.id, {
        finalPhotoId: finalPhoto?.id || null,
        finalNotes: notes,
        rating: rating || null,
        whatToChangeNextTime: nextTime,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="wordmark" style={{ fontSize: '1.8rem' }}>Another one for the diary. ♥</p>
        <p className="muted">{session.recipe.title} · Bake #{session.bakeNumber}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <div className="field">
          <label>Final photo</label>
          {finalPhoto && <img src={finalPhoto.url} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: 8 }} />}
          {!alreadyCompleted && <PhotoUpload label={finalPhoto ? 'Change photo' : 'Add final photo'} onUploaded={setFinalPhoto} />}
        </div>
        <div className="field">
          <label>Overall rating</label>
          <StarRating value={rating} onChange={alreadyCompleted ? undefined : setRating} readOnly={alreadyCompleted} />
        </div>
        <div className="field">
          <label>Overall notes</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={alreadyCompleted} placeholder="Perfect balance of tart and sweet…" />
        </div>
        <div className="field">
          <label>What to change next time</label>
          <textarea className="input" value={nextTime} onChange={(e) => setNextTime(e.target.value)} readOnly={alreadyCompleted} placeholder="Try doubling the blueberries next time." />
        </div>

        {alreadyCompleted ? (
          <button className="btn btn-ghost btn-block" onClick={onBack} type="button">Back to Cook Mode</button>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost" onClick={onBack} type="button">Back</button>
            <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save to Journal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
