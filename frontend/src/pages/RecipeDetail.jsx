import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../api/client';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.getRecipe(id)
      .then((res) => setRecipe(res.recipe))
      .catch((err) => setError(err.status === 404 ? 'This recipe could not be found — it may have been deleted.' : err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStartBake() {
    setStarting(true);
    try {
      const res = await api.startSession(id);
      navigate(`/cook/${res.session.id}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
    try {
      await api.deleteRecipe(id);
      navigate('/recipes');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;
  if (error && !recipe) return <div className="page-content"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
        <div className="cover" style={{ aspectRatio: '16/9', borderRadius: 0, ...(recipe.coverImage ? { backgroundImage: `url(${recipe.coverImage.url})` } : {}) }}>
          {!recipe.coverImage && <span style={{ fontSize: '2.5rem' }}>🍰</span>}
        </div>
        <div style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {recipe.category && <span className="badge badge-gold" style={{ marginBottom: 'var(--space-2)' }}>{recipe.category}</span>}
              <h1>{recipe.title}</h1>
            </div>
            {recipe.status === 'draft' && <span className="badge badge-rose">Draft</span>}
          </div>
          {recipe.description && <p>{recipe.description}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            {recipe.yield && <Stat label="Yield" value={recipe.yield} />}
            {recipe.servings && <Stat label="Servings" value={recipe.servings} />}
            {recipe.prepTimeMin && <Stat label="Prep" value={`${recipe.prepTimeMin} min`} />}
            {recipe.cookTimeMin && <Stat label="Bake" value={`${recipe.cookTimeMin} min`} />}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleStartBake} disabled={starting || !recipe.steps.length}>
              {starting ? 'Starting…' : 'Start a Bake'}
            </button>
            <Link to={`/recipes/${id}/edit`} className="btn btn-ghost">Edit</Link>
            <Link to={`/recipes/${id}/nutrition`} className="btn btn-ghost">Nutrition</Link>
            <Link to={`/recipes/${id}/bakes`} className="btn btn-ghost">Bake History</Link>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
          {!recipe.steps.length && <p className="muted" style={{ marginTop: 'var(--space-2)' }}>Add Method steps before starting a Bake.</p>}
        </div>
      </div>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2>Ingredients</h2>
        <div className="card">
          {recipe.ingredients.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{i.name}{i.note ? ` (${i.note})` : ''}</span>
              <span className="muted">{i.quantity} {i.unit}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Method</h2>
        <div className="step-list">
          {recipe.steps.map((s, idx) => (
            <div key={s.id} className="card" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <span className="step-marker">{idx + 1}</span>
              <p style={{ margin: 0 }}>{s.instruction}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: '0.7rem' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
