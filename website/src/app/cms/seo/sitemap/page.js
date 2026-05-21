'use client';
// website/src/app/cms/seo/sitemap/page.js
// Visual sitemap manager — SEO team sees all URLs + can copy/submit

import { useState, useEffect } from 'react';

const API      = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL   || 'https://raazimarzi.com';

const STATIC_PAGES = [
  { url: '/',           priority: '1.0', changefreq: 'weekly',  label: 'Homepage' },
  { url: '/about',      priority: '0.8', changefreq: 'monthly', label: 'About Us' },
  { url: '/contact',    priority: '0.7', changefreq: 'monthly', label: 'Contact' },
  { url: '/Services',   priority: '0.9', changefreq: 'weekly',  label: 'Services' },
];

function PriorityBar({ value }) {
  const pct   = parseFloat(value) * 100;
  const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#94a3b8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export default function SitemapPage() {
  const [pages,    setPages]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [copied,   setCopied]   = useState(false);
  const [xmlView,  setXmlView]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState('');

  useEffect(() => {
    fetch(`${API}/api/cms/sitemap`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setPages(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build full URL list — static + dynamic
  const allUrls = [
    ...STATIC_PAGES.map(p => ({
      loc:        `${SITE_URL}${p.url}`,
      priority:   p.priority,
      changefreq: p.changefreq,
      label:      p.label,
      type:       'static',
    })),
    ...pages.map(p => ({
      loc:        `${SITE_URL}/${p.slug}`,
      lastmod:    p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : '',
      priority:   '0.8',
      changefreq: 'weekly',
      label:      p.slug,
      type:       'dynamic',
    })),
  ];

  // Generate XML string
  const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const copySitemapUrl = () => {
    navigator.clipboard.writeText(`${SITE_URL}/sitemap.xml`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyXml = () => {
    navigator.clipboard.writeText(xmlString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitToGoogle = () => {
    setSubmitting(true);
    setSubmitMsg('');
    // Opens Google Search Console ping URL
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`;
    window.open(pingUrl, '_blank');
    setTimeout(() => {
      setSubmitting(false);
      setSubmitMsg('✅ Pinged Google! Check Search Console to confirm indexing.');
    }, 1000);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 3px' }}>Sitemap</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {allUrls.length} URLs in sitemap — auto-generated from all published pages
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setXmlView(p => !p)}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 8, background: xmlView ? '#0f172a' : '#fff', color: xmlView ? '#fff' : '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {xmlView ? 'Table view' : 'XML view'}
          </button>
          <button
            onClick={copySitemapUrl}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {copied ? '✓ Copied!' : '📋 Copy URL'}
          </button>
          <button
            onClick={submitToGoogle}
            disabled={submitting}
            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, background: '#4285f4', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {submitting ? 'Pinging…' : '🔍 Ping Google'}
          </button>
        </div>
      </div>

      {/* Submit message */}
      {submitMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#16a34a' }}>
          {submitMsg}
        </div>
      )}

      {/* Sitemap URL card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Your sitemap URL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{ flex: 1, fontSize: 14, color: '#0f172a', background: '#f8fafc', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            {SITE_URL}/sitemap.xml
          </code>
          <a href={`${SITE_URL}/sitemap.xml`} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', color: '#64748b', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View →
          </a>
        </div>
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1d4ed8', lineHeight: 1.6 }}>
          <strong>Submit to Google Search Console:</strong> Go to
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', marginLeft: 4 }}>
            search.google.com/search-console
          </a>
          {' '}→ Sitemaps → paste the URL above → Submit.
          Or click <strong>Ping Google</strong> above for a quick ping.
        </div>
      </div>

      {/* XML view */}
      {xmlView ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>sitemap.xml preview</span>
            <button onClick={copyXml} style={{ padding: '5px 12px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit', color: '#64748b' }}>
              {copied ? '✓ Copied!' : 'Copy XML'}
            </button>
          </div>
          <pre style={{ padding: 16, fontSize: 11, lineHeight: 1.7, fontFamily: 'monospace', overflow: 'auto', maxHeight: 480, color: '#374151', background: '#f8fafc', margin: 0, whiteSpace: 'pre' }}>
            {xmlString}
          </pre>
        </div>
      ) : (
        /* Table view */
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            {['URL', 'Priority', 'Change freq', 'Last modified'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Static pages section */}
          <div style={{ padding: '8px 16px 4px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Static pages</span>
          </div>
          {STATIC_PAGES.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px', padding: '10px 16px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{SITE_URL}{p.url}</div>
              </div>
              <div><PriorityBar value={p.priority} /></div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{p.changefreq}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>—</div>
            </div>
          ))}

          {/* Dynamic pages section */}
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading pages…</div>
          ) : pages.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CMS pages ({pages.length})
                </span>
              </div>
              {pages.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px', padding: '10px 16px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{p.slug}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{SITE_URL}/{p.slug}</div>
                  </div>
                  <div><PriorityBar value="0.8" /></div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>weekly</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Footer total */}
          <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Total: <strong>{allUrls.length}</strong> URLs in sitemap
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Auto-updates when you publish new pages
            </span>
          </div>
        </div>
      )}
    </div>
  );
}