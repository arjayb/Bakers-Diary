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
      const res = await api.updateRecipe(recipe.id, {
        favorite: !recipe.favorite
      });

      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? res.recipe : r))
      );
    } catch {
      // Non-blocking dashboard enhancement.
    }
  }

  if (loading) {
    return (
      <div className="center-loading">
        <div className="spinner" />
      </div>
    );
  }

  const totalSteps = continuable?.steps?.length || 0;
  const doneSteps =
    continuable?.steps?.filter((step) => step.completed).length || 0;

  return (
    <div className="page-content dashboard-page">
      {error && <div className="alert alert-error">{error}</div>}

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">What shall we bake today?</p>

          <h1 className="dashboard-greeting">
            Hello, <span>Chef Kats!</span>
          </h1>

          <p className="dashboard-welcome">
            Your recipes, memories, and next bake are waiting for you.
          </p>
        </div>

        <Link to="/recipes/new" className="btn btn-gold dashboard-new-recipe">
          + New Recipe
        </Link>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">From your diary</p>
            <h2>My Recipes</h2>
          </div>

          {recipes.length > 4 && (
            <Link to="/recipes" className="dashboard-view-all">
              View all
            </Link>
          )}
        </div>

        {recipes.length === 0 ? (
          <div className="empty-state card">
            <p>Your recipe library is empty.</p>

            <Link
              to="/recipes/new"
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-3)' }}
            >
              Create your first recipe
            </Link>
          </div>
        ) : (
          <div className="recipe-grid dashboard-recipe-grid">
            {recipes.slice(0, 4).map((recipe) => (
              <Link
                to={`/recipes/${recipe.id}`}
                key={recipe.id}
                className="recipe-card dashboard-recipe-card"
              >
                <div
                  className={`cover ${
                    recipe.coverImage ? 'has-cover' : 'recipe-cover-fallback'
                  }`}
                  style={
                    recipe.coverImage
                      ? {
                          backgroundImage: `url(${recipe.coverImage.url})`
                        }
                      : undefined
                  }
                >
                  {!recipe.coverImage && (
                    <div className="recipe-placeholder">
                      <span className="recipe-placeholder-mark">BD</span>
                      <span>From Chef Kats' kitchen</span>
                    </div>
                  )}
                </div>

                <button
                  className="favorite-dot"
                  onClick={(event) => toggleFavorite(recipe, event)}
                  aria-label="Toggle favorite"
                >
                  {recipe.favorite ? '♥' : '♡'}
                </button>

                <div className="body">
                  <div className="title">{recipe.title}</div>

                  <div className="date">
                    {new Date(recipe.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {continuable && (
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-section-kicker">Pick up where you left off</p>
              <h2>Continue Your Journey</h2>
            </div>
          </div>

          <div className="card dashboard-continue-card">
            <div
              className={`dashboard-continue-cover ${
                continuable.recipe.coverImage ? 'has-cover' : ''
              }`}
              style={
                continuable.recipe.coverImage
                  ? {
                      backgroundImage: `url(${continuable.recipe.coverImage.url})`
                    }
                  : undefined
              }
            >
              {!continuable.recipe.coverImage && <span>BD</span>}
            </div>

            <div className="dashboard-continue-main">
              <div className="dashboard-continue-title">
                {continuable.recipe.title}
              </div>

              <div className="muted dashboard-continue-step">
                Step {doneSteps + 1} of {totalSteps}
              </div>

              <ProgressBar
                percent={(doneSteps / Math.max(totalSteps, 1)) * 100}
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/cook/${continuable.id}`)}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">Kitchen companions</p>
            <h2>Quick Tools</h2>
          </div>
        </div>

        <div className="dashboard-tools">
          <QuickTool to="/converter" icon="⇄" label="Unit Converter" />
          <QuickTool to="/journal" icon="♡" label="My Journal" />
          <QuickTool to="/groceries" icon="✓" label="Grocery List" />
          <QuickTool to="/nutrition" icon="+" label="Nutrition" />
        </div>
      </section>
    </div>
  );
}

function QuickTool({ to, icon, label }) {
  return (
    <Link to={to} className="card dashboard-tool">
      <span className="dashboard-tool-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="dashboard-tool-label">{label}</span>
    </Link>
  );
}
