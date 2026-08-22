import { useEffect, useState } from 'react';
import * as api from '../api/client';

export default function Groceries() {
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getGroceryItems()
      .then((res) => setItems(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!label.trim()) return;
    try {
      const res = await api.addGroceryItem({ label: label.trim() });
      setItems((prev) => [res.item, ...prev]);
      setLabel('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(item) {
    const res = await api.updateGroceryItem(item.id, { checked: !item.checked });
    setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)));
  }

  async function remove(item) {
    await api.deleteGroceryItem(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="page-content">
      <h1>Grocery List</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add an item" style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit">Add</button>
      </form>

      {items.length === 0 ? (
        <div className="empty-state card"><p>Your grocery list is empty. Add items above, or add a recipe's ingredients from its detail page.</p></div>
      ) : (
        <div className="card">
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span style={{ flex: 1, color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                {item.label}{item.quantity ? ` — ${item.quantity}` : ''}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(item)} aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
