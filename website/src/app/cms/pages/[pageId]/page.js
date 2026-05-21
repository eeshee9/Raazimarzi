'use client';
// website/src/app/cms/pages/[pageId]/page.js
// Full page editor — content editing + SEO Drawer
// This is where SeoDrawer actually gets used

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SeoDrawer }  from '@/components/seo/SeoDrawer';
import { ScoreGauge } from '@/components/seo/ScoreGauge';

const API = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

const CATEGORIES = [
  'individual-disputes', 'consumer-disputes', 'commercial-disputes',
  'family-disputes', 'property-disputes', 'neighbour-disputes',
  'contract-disputes', 'partnership-disputes',
  'services', 'about', 'blog', 'other',
];

const PAGE_TYPES = ['dispute', 'blog', 'service', 'static'];

const inp = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#0f172a', background: '#fff',
  boxSizing: 'border-box',
};

export default function PageEditor() {
  const router   = useRouter();
  const params   = useParams();
  const pageId   = params?.pageId;
  const isNew    = pageId === 'new';

  const [form, setForm] = useState({
    title: '', slug: '', category: '', pageType: 'dispute',
    excerpt: '', content: '', status: 'draft',
  });

  const [seoOpen,   setSeoOpen]   = useState(false);
  const [seoScore,  setSeoScore]  = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [loading,   setLoading]   = useState(!isNew);
  const [error,     setError]     = useState('');
  const [realPageId, setRealPageId] = useState(isNew ? null : pageId);

  // Load existing page
  useEffect(() => {
    if (isNew) return;
    fetch(`${API}/api/cms/pages/${pageId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setForm({
          title:    data.title    || '',
          slug:     data.slug     || '',
          category: data.category || '',
          pageType: data.pageType || 'dispute',
          excerpt:  data.excerpt  || '',
          content:  data.content  || '',
          status:   data.status   || 'draft',
        });
        setSeoScore(data.seo?.score || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pageId, isNew]);

  // Auto-generate slug from title on new pages
  const handleTitleChange = (value) => {
    setForm(prev => ({
      ...prev, title: value,
      slug: isNew
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : prev.slug,
    }));
  };

  const save = async (status) => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, status: status || form.status };
      const url     = isNew ? `${API}/api/cms/pages` : `${API}/api/cms/pages/${realPageId}`;
      const method  = isNew ? 'POST' : 'PUT';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');

      if (isNew && data._id) {
        setRealPageId(data._id);
        router.replace(`/cms/pages/${data._id}`);
      }

      setForm(prev => ({ ...prev, status: status || prev.status }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: '#94a3b8' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Loading page…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const scoreColor = seoScore >= 80 ? '#16a34a' : seoScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Top toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/cms/pages')} style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            {isNew ? 'New page' : 'Edit page'}
          </h2>
          <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: form.status === 'published' ? '#dcfce7' : '#fef3c7', color: form.status === 'published' ? '#16a34a' : '#d97706' }}>
            {form.status}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

          {/* SEO button — shows current score */}
          <button
            onClick={() => setSeoOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' }}
          >
            {seoScore > 0
              ? <ScoreGauge score={seoScore} size={22} />
              : <span>🔍</span>
            }
            SEO settings
          </button>

          {/* Save draft */}
          <button
            onClick={() => save('draft')}
            disabled={saving}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: saving ? 'not-allowed' : 'pointer', color: '#64748b', fontFamily: 'inherit' }}
          >
            Save draft
          </button>

          {/* Publish */}
          <button
            onClick={() => save('published')}
            disabled={saving}
            style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, fontFamily: 'inherit', background: saved ? '#16a34a' : saving ? '#94a3b8' : '#0f172a', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : form.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── Page details card ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 18 }}>Page details</h3>

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
            style={{ ...inp, fontSize: 16, fontWeight: 500 }}
          />
        </div>

        {/* Slug */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>URL slug</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <span style={{ padding: '10px 12px', fontSize: 13, color: '#94a3b8', background: '#f8fafc', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>
              raazimarzi.com/
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, '') }))}
              style={{ ...inp, border: 'none', borderRadius: 0, flex: 1 }}
            />
          </div>
        </div>

        {/* Category + Page type row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>Page type</label>
            <select value={form.pageType} onChange={e => setForm(p => ({ ...p, pageType: e.target.value }))} style={inp}>
              {PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
            Excerpt <span style={{ color: '#94a3b8', fontWeight: 400 }}>(short summary)</span>
          </label>
          <textarea
            value={form.excerpt}
            onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
            rows={2}
            placeholder="Brief description of this page…"
            style={{ ...inp, resize: 'vertical', minHeight: 64 }}
          />
        </div>
      </div>

      {/* ── Content card ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '24px' }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 18 }}>Page content</h3>
        <textarea
          value={form.content}
          onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          rows={20}
          placeholder="Write your page content here…&#10;&#10;Include:&#10;• What type of dispute this covers&#10;• How RaaziMarzi helps resolve it&#10;• Steps involved&#10;• Why choose RaaziMarzi"
          style={{ ...inp, resize: 'vertical', minHeight: 400, lineHeight: 1.7 }}
        />
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
          💡 Aim for 600+ words for better SEO ranking. The SEO analyzer will check your content length automatically.
        </p>
      </div>

      {/* ── SEO Drawer — slides in from right ── */}
      <SeoDrawer
        pageId={realPageId}
        open={seoOpen}
        onClose={() => setSeoOpen(false)}
        onScoreChange={(score) => setSeoScore(score)}
      />
    </div>
  );
}