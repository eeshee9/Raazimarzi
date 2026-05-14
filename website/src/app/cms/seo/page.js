// website/src/app/cms/seo/page.js
// Site-wide SEO dashboard — SEO team sees all pages + scores + issues

import Link from 'next/link';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';
import BlogPost from '@/models/BlogPost';

async function getSeoData() {
  await connectDB();

  const [pages, blogs, overview] = await Promise.all([
    Page.find({ status: 'published' })
      .select('title slug category seo.score seo.title seo.description seo.focusKeyword seo.checks updatedAt')
      .sort({ 'seo.score': 1 })  // worst first
      .limit(50)
      .lean(),

    BlogPost.find({ status: 'published' })
      .select('title slug seo.score seo.title seo.focusKeyword updatedAt')
      .sort({ 'seo.score': 1 })
      .limit(20)
      .lean(),

    Page.aggregate([
      { $match: { status: 'published' } },
      { $group: {
        _id: null,
        total:     { $sum: 1 },
        avgScore:  { $avg: '$seo.score' },
        excellent: { $sum: { $cond: [{ $gte: ['$seo.score', 80] }, 1, 0] } },
        good:      { $sum: { $cond: [{ $and: [{ $gte: ['$seo.score', 50] }, { $lt: ['$seo.score', 80] }] }, 1, 0] } },
        needsWork: { $sum: { $cond: [{ $lt:  ['$seo.score', 50] }, 1, 0] } },
        noTitle:   { $sum: { $cond: [{ $not: ['$seo.title'] }, 1, 0] } },
        noDesc:    { $sum: { $cond: [{ $not: ['$seo.description'] }, 1, 0] } },
        noKeyword: { $sum: { $cond: [{ $not: ['$seo.focusKeyword'] }, 1, 0] } },
      }}
    ]),
  ]);

  return { pages, blogs, overview: overview[0] || {} };
}

function ScoreBar({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const bg    = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '1px 6px', borderRadius: 8, minWidth: 32, textAlign: 'center' }}>
        {score}%
      </span>
    </div>
  );
}

export default async function SeoDashboard() {
  const { pages, blogs, overview } = await getSeoData();
  const avgScore = Math.round(overview.avgScore || 0);
  const scoreColor = avgScore >= 80 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div>
      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Avg SEO score',  value: `${avgScore}%`,       color: scoreColor },
          { label: 'Excellent',      value: overview.excellent || 0, color: '#16a34a' },
          { label: 'Good',           value: overview.good     || 0, color: '#d97706' },
          { label: 'Needs work',     value: overview.needsWork|| 0, color: '#dc2626' },
          { label: 'No title',       value: overview.noTitle  || 0, color: '#dc2626' },
          { label: 'No description', value: overview.noDesc   || 0, color: '#dc2626' },
          { label: 'No keyword',     value: overview.noKeyword|| 0, color: '#d97706' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e2e8f0', padding: '16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pages needing SEO work */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Pages — sorted by SEO score (worst first)
          </h3>
          <Link href="/cms/pages" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>View all →</Link>
        </div>

        {pages.map((page, i) => (
          <Link key={page._id} href={`/cms/pages/${page._id}`} style={{
            display: 'grid', gridTemplateColumns: '1fr 150px 90px',
            padding: '12px 20px', borderBottom: '0.5px solid #f8fafc',
            textDecoration: 'none',
            background: i % 2 === 0 ? '#fff' : '#fafafa',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>{page.title}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!page.seo?.title      && <span style={{ fontSize: 10, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>No title</span>}
                {!page.seo?.description && <span style={{ fontSize: 10, color: '#d97706', background: '#fef3c7', padding: '1px 5px', borderRadius: 4 }}>No description</span>}
                {!page.seo?.focusKeyword && <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>No keyword</span>}
              </div>
            </div>
            <div style={{ alignSelf: 'center', paddingRight: 12 }}>
              <ScoreBar score={page.seo?.score || 0} />
            </div>
            <div style={{ alignSelf: 'center', fontSize: 11, color: '#94a3b8' }}>
              {page.category || '—'}
            </div>
          </Link>
        ))}
      </div>

      {/* Blog posts */}
      {blogs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Blog posts SEO</h3>
            <Link href="/cms/blogs" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>View all →</Link>
          </div>
          {blogs.map((blog, i) => (
            <Link key={blog._id} href={`/cms/blogs/${blog._id}`} style={{
              display: 'grid', gridTemplateColumns: '1fr 150px',
              padding: '12px 20px', borderBottom: '0.5px solid #f8fafc',
              textDecoration: 'none',
              background: i % 2 === 0 ? '#fff' : '#fafafa',
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{blog.title}</div>
              <div style={{ alignSelf: 'center' }}>
                <ScoreBar score={blog.seo?.score || 0} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}