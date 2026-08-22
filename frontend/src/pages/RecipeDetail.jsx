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
      .catch((err) =>
        setError(
          err.status === 404
            ? 'This recipe could not be found — it may have been deleted.'
            : err.message
        )
      )
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

  if (loading) {
    return <div className="center-loading"><div className="spinner" /></div>;
  }

  if (error && !recipe) {
    return (
      <div className="page-content">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-content recipe-detail-page">
      {error && <div className="alert alert-error">{error}</div>}

      <article className="recipe-hero card">
        <div
          className={`recipe-hero-cover ${
            recipe.coverImage ? 'has-cover' : 'recipe-hero-fallback'
          }`}
          style={
            recipe.coverImage
              ? { backgroundImage: `url(${recipe.coverImage.url})` }
              : undefined
          }
        >
          {!recipe.coverImage && (
            <div className="recipe-hero-placeholder">
              <span>BD</span>
              <small>Chef Kats' Recipe</small>
            </div>
          )}
        </div>

        <div className="recipe-hero-content">
          <div className="recipe-hero-heading">
            <div>
              {recipe.category && (
                <span className="badge badge-gold recipe-category">
                  {recipe.category}
                </span>
              )}

              <h1>{recipe.title}</h1>
            </div>

            {recipe.status === 'draft' && (
              <span className="badge badge-rose">Draft</span>
            )}
          </div>

          {recipe.description && (
            <p className="recipe-description">{recipe.description}</p>
          )}

          <div className="recipe-stats">
            {recipe.yield && <Stat label="Yield" value={recipe.yield} />}
            {recipe.servings && <Stat label="Servings" value={recipe.servings} />}
            {recipe.prepTimeMin && (
              <Stat label="Prep" value={`${recipe.prepTimeMin} min`} />
            )}
            {recipe.cookTimeMin && (
              <Stat label="Bake" value={`${recipe.cookTimeMin} min`} />
            )}
          </div>

          <div className="recipe-actions">
            <button
              className="btn btn-primary recipe-start-bake"
              onClick={handleStartBake}
              disabled={starting || !recipe.steps.length}
            >
              {starting ? 'Starting…' : 'Start a Bake'}
            </button>

            <Link to={`/recipes/${id}/edit`} className="btn btn-ghost">
              Edit
            </Link>

            <Link to={`/recipes/${id}/nutrition`} className="btn btn-ghost">
              Nutrition
            </Link>

            <Link to={`/recipes/${id}/bakes`} className="btn btn-ghost">
              Bake History
            </Link>

            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>

          {!recipe.steps.length && (
            <p className="muted recipe-method-warning">
              Add Method steps before starting a Bake.
            </p>
          )}
        </div>
      </article>

      <section className="recipe-detail-section">
        <div className="recipe-section-heading">
          <p className="eyebrow">What you'll need</p>
          <h2>Ingredients</h2>
        </div>

        <div className="card ingredient-card">
          {recipe.ingredients.map((ingredient) => (
            <div key={ingredient.id} className="recipe-ingredient-row">
              <span>
                {ingredient.name}
                {ingredient.note ? ` (${ingredient.note})` : ''}
              </span>

              <span className="muted">
                {ingredient.quantity} {ingredient.unit}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="recipe-detail-section">
        <div className="recipe-section-heading">
          <p className="eyebrow">From recipe to memory</p>
          <h2>Method</h2>
        </div>

        <div className="recipe-method-list">
          {recipe.steps.map((step, index) => (
            <div key={step.id} className="card recipe-method-step">
              <span className="step-marker recipe-method-number">
                {index + 1}
              </span>

              <p>{step.instruction}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="recipe-stat">
      <div className="recipe-stat-label">{label}</div>
      <div className="recipe-stat-value">{value}</div>
    </div>
  );
}
