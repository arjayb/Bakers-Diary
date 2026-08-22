import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import { PhotoUpload } from '../components/PhotoUpload';
import { RECIPE_CATEGORIES, UNIT_OPTIONS } from '../constants';

const STAGES = ['Basics', 'Ingredients', 'Method', 'Review'];

let idCounter = 0;
const tempId = () => `tmp-${++idCounter}`;

export default function RecipeEditor() {
  const { id } = useParams(); // undefined when creating new
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [stage, setStage] = useState(0);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasSessions, setHasSessions] = useState(false);

  const [basics, setBasics] = useState({
    title: '', description: '', category: '', yield: '', servings: '', prepTimeMin: '', cookTimeMin: '', coverImageId: null, coverImageUrl: null,
  });
  const [ingredients, setIngredients] = useState([{ id: tempId(), name: '', quantity: '', unit: 'g', note: '' }]);
  const [steps, setSteps] = useState([{ id: tempId(), instruction: '', timerSeconds: '' }]);

  useEffect(() => {
    if (!isEditing) return;
    api.getRecipe(id).then((res) => {
      const r = res.recipe;
      setBasics({
        title: r.title, description: r.description || '', category: r.category || '',
        yield: r.yield || '', servings: r.servings || '', prepTimeMin: r.prepTimeMin || '', cookTimeMin: r.cookTimeMin || '',
        coverImageId: r.coverImage?.id || null, coverImageUrl: r.coverImage?.url || null,
      });
      setIngredients(r.ingredients.length ? r.ingredients.map((i) => ({ ...i, quantity: String(i.quantity) })) : [{ id: tempId(), name: '', quantity: '', unit: 'g', note: '' }]);
      setSteps(r.steps.length ? r.steps.map((s) => ({ ...s, timerSeconds: s.timerSeconds ? String(s.timerSeconds) : '' })) : [{ id: tempId(), instruction: '', timerSeconds: '' }]);
      api.getRecipeBakes(id).then((bres) => setHasSessions((bres.sessions || []).length > 0)).catch(() => {});
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id, isEditing]);

  function updateIngredient(idx, field, value) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }
  function addIngredient() {
    setIngredients((prev) => [...prev, { id: tempId(), name: '', quantity: '', unit: 'g', note: '' }]);
  }
  function removeIngredient(idx) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveIngredient(idx, dir) {
    setIngredients((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateStep(idx, field, value) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }
  function addStep() {
    setSteps((prev) => [...prev, { id: tempId(), instruction: '', timerSeconds: '' }]);
  }
  function removeStep(idx) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveStep(idx, dir) {
    setSteps((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function buildPayload(status) {
    return {
      title: basics.title.trim(),
      description: basics.description,
      category: basics.category,
      yield: basics.yield,
      servings: basics.servings || null,
      prepTimeMin: basics.prepTimeMin || null,
      cookTimeMin: basics.cookTimeMin || null,
      coverImageId: basics.coverImageId,
      status,
      ingredients: ingredients.filter((i) => i.name.trim()).map((i, idx) => ({ name: i.name.trim(), quantity: Number(i.quantity) || 0, unit: i.unit, note: i.note || null, order: idx })),
      // §11: editing steps is blocked server-side once a recipe has bake
      // history, to protect SessionStep references — see recipeController.
      // Omit `steps` on that PATCH so the update doesn't even attempt it.
      ...(!(isEditing && hasSessions) && {
        steps: steps.filter((s) => s.instruction.trim()).map((s, idx) => ({ instruction: s.instruction.trim(), timerSeconds: s.timerSeconds || null, order: idx })),
      }),
    };
  }

  async function handleSave(status) {
    if (!basics.title.trim()) {
      setError('Give the recipe a title before saving.');
      setStage(0);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(status);
      const res = isEditing ? await api.updateRecipe(id, payload) : await api.createRecipe(payload);
      navigate(`/recipes/${res.recipe.id}`);
    } catch (err) {
      setError(err.message || 'Could not save this recipe.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <h1>{isEditing ? `Edit ${basics.title || 'Recipe'}` : 'New Recipe'}</h1>

      {/* §11: guided flow, "not a hard lock" — every stage tab is always
          clickable, not gated behind completing the previous one. */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-5)', overflowX: 'auto' }}>
        {STAGES.map((s, i) => (
          <button
            key={s}
            className={`btn btn-sm ${stage === i ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStage(i)}
            type="button"
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {isEditing && hasSessions && (
        <div className="alert alert-success" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
          This recipe has bake history attached — step text stays editable here, but steps can't be added/removed/reordered without affecting past Bakes, so that's locked for this recipe.
        </div>
      )}

      {stage === 0 && (
        <div className="card">
          <div className="field">
            <label>Cover photo</label>
            {basics.coverImageUrl && <img src={basics.coverImageUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: 8 }} />}
            <PhotoUpload label={basics.coverImageUrl ? 'Change photo' : 'Add cover photo'} onUploaded={(asset) => setBasics((b) => ({ ...b, coverImageId: asset.id, coverImageUrl: asset.url }))} />
          </div>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" className="input" value={basics.title} onChange={(e) => setBasics({ ...basics, title: e.target.value })} placeholder="Chocolate Babka" required />
          </div>
          <div className="field">
            <label htmlFor="description">Description / notes</label>
            <textarea id="description" className="input" value={basics.description} onChange={(e) => setBasics({ ...basics, description: e.target.value })} placeholder="Rich chocolate-swirled yeasted bread…" />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" className="input" value={basics.category} onChange={(e) => setBasics({ ...basics, category: e.target.value })}>
              <option value="">Select a category</option>
              {RECIPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="field"><label>Yield</label><input className="input" value={basics.yield} onChange={(e) => setBasics({ ...basics, yield: e.target.value })} placeholder="1 loaf" /></div>
            <div className="field"><label>Servings</label><input className="input" type="number" value={basics.servings} onChange={(e) => setBasics({ ...basics, servings: e.target.value })} /></div>
            <div className="field"><label>Prep time (min)</label><input className="input" type="number" value={basics.prepTimeMin} onChange={(e) => setBasics({ ...basics, prepTimeMin: e.target.value })} /></div>
            <div className="field"><label>Bake/cook time (min)</label><input className="input" type="number" value={basics.cookTimeMin} onChange={(e) => setBasics({ ...basics, cookTimeMin: e.target.value })} /></div>
          </div>
        </div>
      )}

      {stage === 1 && (
        <div className="card">
          <h3>Ingredients</h3>
          <div className="ingredient-row" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Ingredient</span><span>Qty</span><span>Unit</span><span />
          </div>
          {ingredients.map((ing, idx) => (
            <div className="ingredient-row" key={ing.id}>
              <input className="input" value={ing.name} onChange={(e) => updateIngredient(idx, 'name', e.target.value)} placeholder="All-purpose flour" />
              <input className="input" type="number" step="any" value={ing.quantity} onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)} />
              <select className="input" value={ing.unit} onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 20, padding: '0 6px' }} onClick={() => moveIngredient(idx, -1)} aria-label="Move up">↑</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 20, padding: '0 6px' }} onClick={() => moveIngredient(idx, 1)} aria-label="Move down">↓</button>
              </div>
              <button type="button" className="btn btn-danger btn-sm" style={{ gridColumn: '1 / -1', justifySelf: 'start' }} onClick={() => removeIngredient(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addIngredient}>+ Add ingredient</button>
        </div>
      )}

      {stage === 2 && (
        <div className="card">
          <h3>Method</h3>
          {steps.map((s, idx) => (
            <div key={s.id} className="card" style={{ marginBottom: 'var(--space-3)', background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <strong>Step {idx + 1}</strong>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveStep(idx, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveStep(idx, 1)} aria-label="Move down">↓</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeStep(idx)}>Remove</button>
                </div>
              </div>
              <textarea className="input" value={s.instruction} onChange={(e) => updateStep(idx, 'instruction', e.target.value)} placeholder="Knead the dough for 10 minutes until elastic." />
              <div className="field" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }}>
                <label>Timer (seconds, optional)</label>
                <input className="input" type="number" value={s.timerSeconds} onChange={(e) => updateStep(idx, 'timerSeconds', e.target.value)} placeholder="e.g. 600 for 10 minutes" />
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}>+ Add step</button>
        </div>
      )}

      {stage === 3 && (
        <div className="card">
          <h3>Review</h3>
          <p><strong style={{ color: 'var(--text-primary)' }}>{basics.title || '(no title yet)'}</strong></p>
          <p className="muted">{ingredients.filter((i) => i.name.trim()).length} ingredients · {steps.filter((s) => s.instruction.trim()).length} steps</p>
          {basics.description && <p>{basics.description}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={saving} type="button">
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button className="btn btn-primary" onClick={() => handleSave('published')} disabled={saving} type="button">
          {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>
    </div>
  );
}
