'use client';
// website/src/app/cms/pages/page.js
// Lists all RaaziMarzi pages with SEO scores

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

const FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Drafts' },
];

function ScorePill({ score }) {
  if (!score && score !== 0) return <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const bg    = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>
      {score}%
    </span>
  );
}

export default function PagesIndex() {
  const [pages,   setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search) params.set('search', search);

    fetch(`${API}/api/cms/pages?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setPages(data.pages || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter, search]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 3px' }}>Pages</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{pages.length} pages</p>
        </div>
        <Link href="/cms/pages/new" style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          + New page
        </Link>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pages…"
          style={{ padding: '7px 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', width: 220, background: '#fff' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: filter === f.value ? '#0f172a' : '#f1f5f9', color: filter === f.value ? '#fff' : '#64748b' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 100px', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          {['Page title', 'Category', 'Status', 'SEO score'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading pages…</div>
        ) : pages.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>No pages yet</div>
            <Link href="/cms/pages/new" style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Create your first page
            </Link>
          </div>
        ) : pages.map(page => (
          <Link key={page._id} href={`/cms/pages/${page._id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 100px', padding: '12px 16px', borderBottom: '1px solid #f8fafc', textDecoration: 'none', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>{page.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>/{page.slug}</div>
              {!page.seo?.title && (
                <span style={{ fontSize: 10, color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: 4, marginTop: 2, display: 'inline-block' }}>Missing SEO title</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>{page.category || '—'}</div>
            <div style={{ alignSelf: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: page.status === 'published' ? '#16a34a' : '#d97706', background: page.status === 'published' ? '#dcfce7' : '#fef3c7', padding: '2px 8px', borderRadius: 10 }}>
                {page.status}
              </span>
            </div>
            <div style={{ alignSelf: 'center' }}>
              <ScorePill score={page.seo?.score} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}