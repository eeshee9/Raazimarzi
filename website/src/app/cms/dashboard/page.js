// website/src/app/cms/dashboard/page.js
// Main CMS dashboard — overview for SEO team

import Link from 'next/link';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';
import BlogPost from '@/models/BlogPost';

async function getStats() {
  try {
    await connectDB();
    const [
      totalPages,
      publishedPages,
      totalBlogs,
      publishedBlogs,
      avgSeoScore,
      pagesNeedingWork,
      missingMeta,
    ] = await Promise.all([
      Page.countDocuments({}),
      Page.countDocuments({ status: 'published' }),
      BlogPost.countDocuments({}),
      BlogPost.countDocuments({ status: 'published' }),
      Page.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, avg: { $avg: '$seo.score' } } },
      ]),
      Page.countDocuments({ status: 'published', 'seo.score': { $lt: 50 } }),
      Page.countDocuments({ status: 'published', $or: [{ 'seo.title': { $exists: false } }, { 'seo.description': { $exists: false } }] }),
    ]);

    return {
      totalPages, publishedPages, totalBlogs, publishedBlogs,
      avgSeoScore: Math.round(avgSeoScore[0]?.avg || 0),
      pagesNeedingWork, missingMeta,
    };
  } catch {
    return { totalPages: 0, publishedPages: 0, totalBlogs: 0, publishedBlogs: 0, avgSeoScore: 0, pagesNeedingWork: 0, missingMeta: 0 };
  }
}

function StatCard({ label, value, sub, color = '#0f172a', href }) {
  const card = (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: '0.5px solid #e2e8f0', padding: '20px 22px',
      textDecoration: 'none', display: 'block',
      transition: 'box-shadow 0.15s',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

const QUICK_ACTIONS = [
  { href: '/cms/pages/new',   icon: '📄', label: 'New page',       desc: 'Create a dispute or service page' },
  { href: '/cms/blogs/new',   icon: '✍️',  label: 'New blog post',  desc: 'Write a new article or guide' },
  { href: '/cms/seo',         icon: '📊', label: 'SEO dashboard',  desc: 'Review and fix SEO issues' },
  { href: '/cms/seo/redirects', icon: '↪️', label: 'Redirects',   desc: 'Manage 301/302 redirects' },
];

export default async function CmsDashboard() {
  const stats = await getStats();

  const scoreColor =
    stats.avgSeoScore >= 80 ? '#16a34a' :
    stats.avgSeoScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
          Welcome back 👋
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Here's the current state of RaaziMarzi content and SEO.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Published pages"  value={stats.publishedPages}    sub={`${stats.totalPages} total`}      href="/cms/pages" />
        <StatCard label="Blog posts"       value={stats.publishedBlogs}     sub={`${stats.totalBlogs} total`}      href="/cms/blogs" />
        <StatCard label="Avg SEO score"    value={`${stats.avgSeoScore}%`}  sub="across all pages" color={scoreColor} href="/cms/seo" />
        <StatCard label="Needs SEO work"   value={stats.pagesNeedingWork}   sub="score below 50%"  color={stats.pagesNeedingWork > 0 ? '#dc2626' : '#16a34a'} href="/cms/seo" />
        <StatCard label="Missing meta"     value={stats.missingMeta}        sub="no title or description" color={stats.missingMeta > 0 ? '#d97706' : '#16a34a'} href="/cms/seo" />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Quick actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: '#fff', borderRadius: 10, padding: '14px 16px',
              border: '0.5px solid #e2e8f0', textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}>
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{action.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SEO score bar */}
      {stats.avgSeoScore > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>Overall site SEO health</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor }}>{stats.avgSeoScore}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${stats.avgSeoScore}%`, background: scoreColor, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            <span style={{ color: '#16a34a' }}>● 80–100 Excellent</span>
            <span style={{ color: '#d97706' }}>● 50–79 Good</span>
            <span style={{ color: '#dc2626' }}>● 0–49 Needs work</span>
          </div>
        </div>
      )}
    </div>
  );
}