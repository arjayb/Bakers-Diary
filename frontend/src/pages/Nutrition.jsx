import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../api/client';

export default function Nutrition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState(id || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const offline = api.isOfflineEdition();

  useEffect(() => {
    api.getRecipes().then((res) => setRecipes(res.recipes || [])).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    setData(null);
    api.getRecipeNutrition(selectedId)
      .then((res) => {
        if (!res?.recipe || !res?.perServing) {
          setError(res?.message || 'Nutrition data is not available for this recipe right now.');
          return;
        }
        setData(res);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  async function handleRematch(name) {
    try {
      await api.rematchIngredient(selectedId, name);
      const res = await api.getRecipeNutrition(selectedId);
      if (!res?.recipe || !res?.perServing) throw new Error(res?.message || 'Nutrition data is not available right now.');
      setData(res);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate(-1)} aria-label="Go back">← Back</button>
        <h1 style={{ margin: 0 }}>Nutrition</h1>
      </div>

      {offline && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Offline edition</strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            Live nutrition lookup needs an internet connection. Your recipes and baking tools remain available offline.
          </p>
        </div>
      )}

      {!id && (
        <div className="field">
          <label>Recipe</label>
          <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Select a recipe</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
      )}

      {loading && <div className="center-loading"><div className="spinner" /></div>}
      {error && (
        <div className="alert alert-error">
          {error}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Link className="btn btn-ghost btn-sm" to={id ? `/recipes/${id}` : '/more'}>{id ? 'Return to recipe' : 'Return to More'}</Link>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="card">
            <p className="eyebrow">{data.recipe.title}</p>
            <p className="muted">Serving size: 1 of {data.recipe.servings} · Servings: {data.recipe.servings}</p>
            <div style={{ textAlign: 'center', margin: 'var(--space-4) 0' }}>
              <div className="muted">Calories</div>
              <div style={{ fontSize: '2.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{data.perServing.calories} <span style={{ fontSize: '1rem', fontWeight: 400 }}>kcal</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <Macro label="Carbs" grams={data.perServing.carbs} color="var(--rose)" />
              <Macro label="Fat" grams={data.perServing.fat} color="var(--gold)" />
              <Macro label="Protein" grams={data.perServing.protein} color="var(--success)" />
            </div>
          </div>
          <div className="card">
            <h3>Nutrition Summary (per serving)</h3>
            <Row label="Total Fat" value={`${data.perServing.fat} g`} />
            <Row label="Saturated Fat" value={`${data.perServing.satFat} g`} indent />
            <Row label="Cholesterol" value={`${data.perServing.cholesterolMg} mg`} />
            <Row label="Sodium" value={`${data.perServing.sodiumMg} mg`} />
            <Row label="Total Carbohydrates" value={`${data.perServing.carbs} g`} />
            <Row label="Dietary Fiber" value={`${data.perServing.fiber} g`} indent />
            <Row label="Sugars" value={`${data.perServing.sugar} g`} indent />
            <Row label="Protein" value={`${data.perServing.protein} g`} />
          </div>
          {(data.unmatchedIngredients || []).length > 0 && (
            <div className="card" style={{ background: 'var(--error-soft)' }}>
              <p style={{ color: 'var(--error)', margin: 0, fontWeight: 600 }}>Not matched to a food database:</p>
              {data.unmatchedIngredients.map((name) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span>{name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRematch(name)} type="button">Try again</button>
                </div>
              ))}
            </div>
          )}
          {(data.excludedIngredients || []).length > 0 && (
            <div className="card" style={{ background: 'var(--gold-soft)' }}>
              <p style={{ color: 'var(--gold)', margin: 0, fontWeight: 600 }}>Excluded from totals (no reliable weight):</p>
              <p className="muted">{data.excludedIngredients.join(', ')}</p>
            </div>
          )}
          {data.sourceNotice && <p className="muted" style={{ marginTop: 'var(--space-4)' }}>ⓘ {data.sourceNotice}</p>}
        </>
      )}

      {!data && !loading && !error && selectedId === '' && (
        <div className="empty-state card"><p>Choose a recipe to see its nutrition.</p></div>
      )}
    </div>
  );
}

function Macro({ label, grams, color }) {
  return <div style={{ textAlign: 'center' }}><div style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{grams}g</div><div className="muted" style={{ fontSize: '0.75rem' }}>{label}</div></div>;
}

function Row({ label, value, indent }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', paddingLeft: indent ? 16 : 0 }}><span className={indent ? 'muted' : ''} style={!indent ? { color: 'var(--text-primary)' } : {}}>{label}</span><span style={{ color: 'var(--text-primary)' }}>{value}</span></div>;
}
