// website/src/components/cms/PageEditorClient.js
// The full page editor — content fields + SEO drawer button
// This is the file that uses SeoDrawer — the "USAGE" file for your project
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SeoDrawer } from '@/components/seo/SeoDrawer';
import { ScoreGauge } from '@/components/seo/ScoreGauge';

const CATEGORIES = [
  'individual-disputes',
  'consumer-disputes',
  'commercial-disputes',
  'family-disputes',
  'property-disputes',
  'neighbour-disputes',
  'contract-disputes',
  'partnership-disputes',
  'services',
  'about',
  'other',
];

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: '0.5px solid #e2e8f0', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#0f172a',
  background: '#fff', boxSizing: 'border-box',
};

export default function PageEditorClient({ pageId, initialData, isNew }) {
  const router = useRouter();

  const [form, setForm] = useState({
    title:    initialData?.title    || '',
    slug:     initialData?.slug     || '',
    category: initialData?.category || '',
    excerpt:  initialData?.excerpt  || '',
    content:  initialData?.content  || '',
    status:   initialData?.status   || 'draft',
  });

  const [seoOpen,  setSeoOpen]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');
  const [seoScore, setSeoScore] = useState(initialData?.seo?.score || 0);

  // Auto-generate slug from title
  const handleTitleChange = (value) => {
    setForm(prev => ({
      ...prev,
      title: value,
      slug: isNew
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : prev.slug,
    }));
  };

  const save = async (publishStatus) => {
    setSaving(true);
    setError('');

    try {
      const payload = { ...form, status: publishStatus || form.status };
      const url    = isNew ? '/api/cms/pages' : `/api/cms/pages/${pageId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // If new page, redirect to edit page with real ID
      if (isNew && data._id) {
        router.replace(`/cms/pages/${data._id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const scoreColor = seoScore >= 80 ? '#16a34a' : seoScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 52px)', position: 'relative' }}>

      {/* ── Main editor area ── */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 0 }}>

        {/* Top toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.back()} style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
              ← Back
            </button>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {isNew ? 'New page' : 'Edit page'}
            </h2>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
              background: form.status === 'published' ? '#dcfce7' : '#fef3c7',
              color:      form.status === 'published' ? '#16a34a' : '#d97706',
            }}>
              {form.status}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* SEO Settings button — shows current score */}
            <button
              onClick={() => setSeoOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px', fontSize: 13, fontWeight: 500,
                border: '0.5px solid #e2e8f0', borderRadius: 8,
                background: '#fff', cursor: 'pointer',
                color: '#64748b', fontFamily: 'inherit',
              }}
            >
              {seoScore > 0 ? (
                <ScoreGauge score={seoScore} size={22} />
              ) : (
                <span>🔍</span>
              )}
              SEO settings
            </button>

            {/* Save draft */}
            <button
              onClick={() => save('draft')}
              disabled={saving}
              style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: saving ? 'not-allowed' : 'pointer', color: '#64748b', fontFamily: 'inherit' }}
            >
              Save draft
            </button>

            {/* Publish */}
            <button
              onClick={() => save('published')}
              disabled={saving}
              style={{
                padding: '7px 18px', fontSize: 13, fontWeight: 600,
                border: 'none', borderRadius: 8, fontFamily: 'inherit',
                background: saved ? '#16a34a' : saving ? '#94a3b8' : '#0f172a',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : form.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '0.5px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* ── Form fields ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: '24px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 18 }}>Page details</h3>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Page title <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="E.g. Property & Rental Disputes"
              style={{ ...inputStyle, fontSize: 16, fontWeight: 500 }}
            />
          </div>

          {/* Slug */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
              URL slug
            </label>
            <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', background: '#f8fafc', borderRight: '0.5px solid #e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                raazimarzi.com/
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, '') }))}
                style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </select>
          </div>

          {/* Excerpt */}
          <div style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Excerpt <span style={{ color: '#94a3b8', fontWeight: 400 }}>(short summary)</span>
            </label>
            <textarea
              value={form.excerpt}
              onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
              rows={3}
              placeholder="Brief description of this page…"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </div>
        </div>

        {/* Content area */}
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 18 }}>Page content</h3>
          <textarea
            value={typeof form.content === 'string' ? form.content : JSON.stringify(form.content, null, 2)}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            rows={18}
            placeholder="Write your page content here…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 360, fontFamily: 'inherit', lineHeight: 1.7 }}
          />
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            💡 You can integrate TipTap or any rich text editor here in Phase 2.
          </p>
        </div>
      </div>

      {/* ── SEO Drawer ── */}
      {/* This is the key integration — SeoDrawer slides in from the right */}
      <SeoDrawer
        pageId={pageId}
        open={seoOpen}
        onClose={() => setSeoOpen(false)}
        onScoreChange={(score) => setSeoScore(score)}
      />
    </div>
  );
}