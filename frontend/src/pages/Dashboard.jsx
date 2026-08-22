import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import { ProgressBar } from '../components/ui';

export default function Dashboard() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [continuable, setContinuable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getRecipes(), api.getContinuableSession()])
      .then(([recipesRes, sessionRes]) => {
        setRecipes(recipesRes.recipes || []);
        setContinuable(sessionRes.session || null);
      })
      .catch((err) => setError(err.message || 'Could not load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleFavorite(recipe, e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.updateRecipe(recipe.id, { favorite: !recipe.favorite });
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? res.recipe : r)));
    } catch { /* favorite toggle failing silently degrades gracefully — not core to the journey */ }
  }

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  const totalSteps = continuable?.steps?.length || 0;
  const doneSteps = continuable?.steps?.filter((s) => s.completed).length || 0;

  return (
    <div className="page-content">
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <p className="eyebrow">What shall we bake today?</p>
          <h1>Hello, Chef Kats!</h1>
        </div>
        <Link to="/recipes/new" className="btn btn-gold">+ New Recipe</Link>
      </div>

      <section style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>My Recipes</h2>
          {recipes.length > 4 && <Link to="/recipes" className="muted" style={{ color: 'var(--rose)' }}>View all</Link>}
        </div>
        {recipes.length === 0 ? (
          <div className="empty-state card">
            <p>Your recipe library is empty.</p>
            <Link to="/recipes/new" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>Create your first recipe</Link>
          </div>
        ) : (
          <div className="recipe-grid">
            {recipes.slice(0, 4).map((r) => (
              <Link to={`/recipes/${r.id}`} key={r.id} className="recipe-card">
                <div className="cover" style={r.coverImage ? { backgroundImage: `url(${r.coverImage.url})` } : {}}>
                  {!r.coverImage && '🍰'}
                </div>
                <button className="favorite-dot" onClick={(e) => toggleFavorite(r, e)} aria-label="Toggle favorite">
                  {r.favorite ? '♥' : '♡'}
                </button>
                <div className="body">
                  <div className="title">{r.title}</div>
                  <div className="date">{new Date(r.updatedAt).toLocaleDateString()}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {continuable && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Continue Your Journey</h2>
          <div className="card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div className="cover" style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', flexShrink: 0, backgroundImage: continuable.recipe.coverImage ? `url(${continuable.recipe.coverImage.url})` : undefined }}>
              {!continuable.recipe.coverImage && '🍰'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{continuable.recipe.title}</div>
              <div className="muted" style={{ marginBottom: 6 }}>Step {doneSteps + 1} of {totalSteps}</div>
              <ProgressBar percent={(doneSteps / Math.max(totalSteps, 1)) * 100} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/cook/${continuable.id}`)}>Continue</button>
          </div>
        </section>
      )}

      <section>
        <h2>Quick Tools</h2>
        <div className="recipe-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <QuickTool to="/converter" icon="⇄" label="Unit Converter" />
          <QuickTool to="/journal" icon="📖" label="My Journal (Bakes)" />
          <QuickTool to="/groceries" icon="🛒" label="Groceries List" />
          <QuickTool to="/nutrition" icon="📊" label="Nutrition" />
        </div>
      </section>
    </div>
  );
}

function QuickTool({ to, icon, label }) {
  return (
    <Link to={to} className="card" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: '1.4rem' }} aria-hidden="true">{icon}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
    </Link>
  );
}
