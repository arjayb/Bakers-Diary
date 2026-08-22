import { useRef, useState } from 'react';
import * as api from '../api/client';

export function PhotoUpload({ onUploaded, label = 'Add photo' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadMedia(file);
      onUploaded(res.asset);
    } catch (err) {
      // §34 explicit failure state — the person's other work (form fields,
      // already-attached photos) is untouched, only this upload failed.
      setError(err.message || 'That photo could not be uploaded. Try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
        id={`photo-input-${label}`}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : label}
      </button>
      {error && <p className="alert alert-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
