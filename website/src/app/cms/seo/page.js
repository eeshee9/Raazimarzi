'use client';
// website/src/app/cms/seo/redirects/page.js
// Manage 301/302/410 redirects — SEO team adds/edits/deletes here

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

const STATUS_OPTIONS = [
  { value: 301, label: '301 — Permanent redirect' },
  { value: 302, label: '302 — Temporary redirect' },
  { value: 410, label: '410 — Gone (deleted page)' },
];

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
  fontFamily: 'inherit', color: '#0f172a', background: '#fff',
  boxSizing: 'border-box',
};

function StatusBadge({ code }) {
  const color = code === 301 ? '#16a34a' : code === 302 ? '#d97706' : '#dc2626';
  const bg    = code === 301 ? '#dcfce7' : code === 302 ? '#fef3c7' : '#fee2e2';
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>
      {code}
    </span>
  );
}

function RedirectForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { source: '', destination: '', statusCode: 301 }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source.startsWith('/')) { setError('Source must start with /'); return; }
    if (!form.destination.startsWith('/') && !form.destination.startsWith('http')) {
      setError('Destination must start with / or http'); return;
    }
    setSaving(true);
    setError('');
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>From (source URL)</label>
          <input
            type="text" required
            value={form.source}
            onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
            placeholder="/old-page-url"
            style={inp}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>To (destination URL)</label>
          <input
            type="text" required
            value={form.destination}
            onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
            placeholder="/new-page-url"
            style={inp}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>Type</label>
          <select value={form.statusCode} onChange={e => setForm(p => ({ ...p, statusCode: Number(e.target.value) }))} style={{ ...inp, width: 'auto', minWidth: 80 }}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: 6, fontSize: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={saving} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : initial ? 'Update redirect' : 'Add redirect'}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function RedirectsPage() {
  const [redirects, setRedirects]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [showForm,  setShowForm]    = useState(false);
  const [editItem,  setEditItem]    = useState(null);
  const [search,    setSearch]      = useState('');
  const [deleting,  setDeleting]    = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/cms/redirects`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setRedirects(data.redirects || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form) => {
    const res = await fetch(`${API}/api/cms/redirects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); load(); }
  };

  const handleEdit = async (form) => {
    const res = await fetch(`${API}/api/cms/redirects/${editItem._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    if (res.ok) { setEditItem(null); load(); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this redirect?')) return;
    setDeleting(id);
    await fetch(`${API}/api/cms/redirects/${id}`, { method: 'DELETE', credentials: 'include' });
    setDeleting(null);
    load();
  };

  const handleToggle = async (item) => {
    await fetch(`${API}/api/cms/redirects/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...item, isActive: !item.isActive }),
    });
    load();
  };

  const filtered = redirects.filter(r =>
    r.source.includes(search) || r.destination.includes(search)
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 3px' }}>Redirects</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {redirects.length} redirect{redirects.length !== 1 ? 's' : ''} — changes take effect immediately
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); }}
          style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Add redirect
        </button>
      </div>

      {/* Info box */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
        <strong>How it works:</strong> When someone visits the source URL, they are automatically sent to the destination.
        Use <strong>301</strong> for permanent moves (best for SEO), <strong>302</strong> for temporary, <strong>410</strong> for deleted pages.
      </div>

      {/* Add form */}
      {showForm && !editItem && (
        <RedirectForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {/* Search */}
      {redirects.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search redirects…"
          style={{ ...inp, width: 280, marginBottom: 14 }}
        />
      )}

      {/* Redirects table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 70px 60px 90px', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          {['From', 'To', 'Type', 'Hits', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading redirects…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>↪️</div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
              {search ? 'No redirects match your search.' : 'No redirects yet.'}
            </div>
            {!search && (
              <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                Add first redirect
              </button>
            )}
          </div>
        ) : filtered.map(r => (
          <div key={r._id}>
            {/* Edit form inline */}
            {editItem?._id === r._id ? (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <RedirectForm initial={editItem} onSave={handleEdit} onCancel={() => setEditItem(null)} />
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 70px 60px 90px',
                padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                opacity: r.isActive ? 1 : 0.5,
                alignItems: 'center',
              }}>
                {/* Source */}
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#dc2626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.source}
                </div>
                {/* Destination */}
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.destination}
                </div>
                {/* Status code */}
                <div><StatusBadge code={r.statusCode} /></div>
                {/* Hits */}
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.hits || 0}</div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleToggle(r)}
                    title={r.isActive ? 'Disable' : 'Enable'}
                    style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                  >
                    {r.isActive ? '✅' : '⏸️'}
                  </button>
                  <button
                    onClick={() => setEditItem(r)}
                    title="Edit"
                    style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(r._id)}
                    disabled={deleting === r._id}
                    title="Delete"
                    style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}