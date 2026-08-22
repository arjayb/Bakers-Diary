import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';

export default function RecipeList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getRecipes()
      .then((res) => setRecipes(res.recipes || []))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === 'favorites' ? recipes.filter((r) => r.favorite) : recipes;

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h1>My Recipes</h1>
        <Link to="/recipes/new" className="btn btn-gold btn-sm">+ New</Link>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>All</button>
        <button className={`btn btn-sm ${filter === 'favorites' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('favorites')}>Favorites</button>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state card">
          <p>{filter === 'favorites' ? "No favorites yet — tap ♡ on a recipe to add one." : 'Your recipe library is empty.'}</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {visible.map((r) => (
            <Link to={`/recipes/${r.id}`} key={r.id} className="recipe-card">
              <div className="cover" style={r.coverImage ? { backgroundImage: `url(${r.coverImage.url})` } : {}}>
                {!r.coverImage && '🍰'}
              </div>
              <div className="body">
                <div className="title">{r.title}</div>
                <div className="date">{new Date(r.updatedAt).toLocaleDateString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
