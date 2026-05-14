// website/src/app/cms/pages/page.js
// Lists all RaaziMarzi pages with SEO scores — SEO team can filter and edit

import Link from 'next/link';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';

async function getPages({ filter, sort, search }) {
  await connectDB();
  const query = {};
  if (filter === 'published')  query.status = 'published';
  if (filter === 'draft')      query.status = 'draft';
  if (filter === 'no-seo')     query['seo.title'] = { $exists: false };
  if (filter === 'needs-work') { query.status = 'published'; query['seo.score'] = { $lt: 50 }; }
  if (search) query.title = { $regex: search, $options: 'i' };

  const sortField = sort === 'score' ? { 'seo.score': 1 } :
                    sort === 'title' ? { title: 1 } : { updatedAt: -1 };

  return Page.find(query)
    .select('title slug status category seo.score seo.title seo.description seo.focusKeyword updatedAt')
    .sort(sortField)
    .limit(100)
    .lean();
}

function ScorePill({ score }) {
  if (!score && score !== 0) return <span style={{ fontSize: 11, color: '#94a3b8' }}>Not analyzed</span>;
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const bg    = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 10 }}>
      {score}%
    </span>
  );
}

export default async function PagesIndex({ searchParams }) {
  const filter = searchParams?.filter || 'all';
  const sort   = searchParams?.sort   || 'updated';
  const search = searchParams?.search || '';
  const pages  = await getPages({ filter, sort, search });

  const FILTERS = [
    { value: 'all',        label: 'All pages' },
    { value: 'published',  label: 'Published' },
    { value: 'draft',      label: 'Drafts' },
    { value: 'needs-work', label: 'Needs SEO work' },
    { value: 'no-seo',     label: 'Missing meta' },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 3px' }}>Pages</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{pages.length} pages found</p>
        </div>
        <Link href="/cms/pages/new" style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          + New page
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <Link key={f.value} href={`/cms/pages?filter=${f.value}`} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            textDecoration: 'none',
            background: filter === f.value ? '#0f172a' : '#f1f5f9',
            color:      filter === f.value ? '#fff'    : '#64748b',
          }}>
            {f.label}
          </Link>
        ))}
      </div>

      {/* Pages table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 120px 80px', padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#f8fafc' }}>
          {['Page title', 'Category', 'Status', 'Focus keyword', 'SEO score'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {pages.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            No pages found.
          </div>
        ) : pages.map(page => (
          <Link key={page._id} href={`/cms/pages/${page._id}`} style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 90px 120px 80px',
            padding: '12px 16px', borderBottom: '0.5px solid #f8fafc',
            textDecoration: 'none', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Title */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>{page.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>/{page.slug}</div>
              {!page.seo?.title && (
                <span style={{ fontSize: 10, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                  Missing SEO title
                </span>
              )}
            </div>
            {/* Category */}
            <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>
              {page.category || '—'}
            </div>
            {/* Status */}
            <div style={{ alignSelf: 'center' }}>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: page.status === 'published' ? '#16a34a' : '#d97706',
                background: page.status === 'published' ? '#dcfce7' : '#fef3c7',
                padding: '2px 8px', borderRadius: 10,
              }}>
                {page.status}
              </span>
            </div>
            {/* Focus keyword */}
            <div style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {page.seo?.focusKeyword || <span style={{ color: '#e2e8f0' }}>Not set</span>}
            </div>
            {/* SEO Score */}
            <div style={{ alignSelf: 'center' }}>
              <ScorePill score={page.seo?.score} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}