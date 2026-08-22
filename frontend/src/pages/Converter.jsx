import { useState } from 'react';
import * as api from '../api/client';
import { UNIT_OPTIONS, UNIT_LABELS } from '../constants';

// §12: single implementation shared by standalone (this page) and
// contextual (recipe editor, via the same component) uses.
export function ConverterWidget({ onUseMeasurement }) {
  const [value, setValue] = useState('2.5');
  const [fromUnit, setFromUnit] = useState('cup');
  const [toUnit, setToUnit] = useState('g');
  const [ingredientName, setIngredientName] = useState('All-purpose flour');
  const [result, setResult] = useState(null);
  const [equivalents, setEquivalents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    setError('');
    setLoading(true);
    try {
      const res = await api.convert({ value: Number(value), fromUnit, toUnit, ingredientName: ingredientName || undefined });
      setResult(res.result);
      setEquivalents(res.equivalents || []);
    } catch (err) {
      // §12/§34: "ingredient conversion requiring identity" / "unsupported
      // conversion" — surfaced as the actual server message, not guessed.
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setResult(null);
  }

  return (
    <div className="card">
      <div className="field">
        <label>From</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input className="input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1 }} />
          <select className="input" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} style={{ flex: 1 }}>
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Ingredient (optional — needed for cup/weight conversions)</label>
        <input className="input" value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} placeholder="All-purpose flour" />
      </div>

      <div style={{ textAlign: 'center', margin: 'var(--space-2) 0' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={swap} aria-label="Swap units">⇅</button>
      </div>

      <div className="field">
        <label>To</label>
        <select className="input" value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
        </select>
      </div>

      <button className="btn btn-primary btn-block" onClick={handleConvert} disabled={loading} type="button">
        {loading ? 'Converting…' : 'Convert'}
      </button>

      {error && <div className="alert alert-error" style={{ marginTop: 'var(--space-3)' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {Math.round(result.value * 100) / 100} {UNIT_LABELS[toUnit]}
          </div>
          {result.warning && <p className="muted">{result.warning}</p>}
          {onUseMeasurement && (
            <button className="btn btn-gold btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => onUseMeasurement({ quantity: result.value, unit: toUnit })} type="button">
              Use This Measurement
            </button>
          )}
        </div>
      )}

      {equivalents.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p className="eyebrow">Also equals</p>
          {equivalents.slice(0, 4).map((eq) => (
            <div key={eq.unit} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{UNIT_LABELS[eq.unit]}</span>
              <span style={{ color: 'var(--text-primary)' }}>{Math.round(eq.value * 100) / 100}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-4)', background: 'var(--bg-elevated)' }}>
        <p style={{ margin: 0, fontSize: '0.82rem' }}>💡 <strong style={{ color: 'var(--text-primary)' }}>Kitchen Tip:</strong> 1 cup flour ≠ 1 cup butter by mass — different ingredients pack differently, so cup-to-gram conversions need to know which ingredient you mean.</p>
      </div>
    </div>
  );
}

export default function Converter() {
  return (
    <div className="page-content">
      <h1>Unit Converter</h1>
      <ConverterWidget />
    </div>
  );
}
