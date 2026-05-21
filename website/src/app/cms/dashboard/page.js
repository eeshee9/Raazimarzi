'use client';
// website/src/app/cms/dashboard/page.js
// Main landing page for SEO team after login

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

const QUICK_ACTIONS = [
  { href: '/cms/pages/new', icon: '📄', label: 'New page',      desc: 'Create a dispute or service page' },
  { href: '/cms/pages',     icon: '✏️',  label: 'Edit pages',    desc: 'Manage existing pages + SEO' },
  { href: '/cms/seo',       icon: '📊', label: 'SEO dashboard', desc: 'Review and fix SEO issues' },
];

function StatCard({ label, value, color = '#0f172a', href }) {
  const content = (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 22px', textDecoration: 'none', display: 'block' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 6 }}>{label}</div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

export default function CmsDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/cms/dashboard`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const overview    = stats?.overview || {};
  const avgScore    = Math.round(overview.avgScore || 0);
  const scoreColor  = avgScore >= 80 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626';

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>Welcome back 👋</h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Here's the current state of RaaziMarzi content and SEO.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 22px', height: 80, animation: 'pulse 1.5s ease infinite' }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard label="Total pages"   value={overview.total     || 0}         href="/cms/pages" />
          <StatCard label="Avg SEO score" value={`${avgScore}%`}    color={scoreColor} href="/cms/seo" />
          <StatCard label="Excellent"     value={overview.excellent || 0}         color="#16a34a" href="/cms/seo" />
          <StatCard label="Needs work"    value={overview.needsWork || 0}         color="#dc2626" href="/cms/seo" />
          <StatCard label="Missing title" value={overview.noTitle   || 0}         color="#d97706" href="/cms/seo" />
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Quick actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', textDecoration: 'none' }}>
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{action.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SEO Health bar */}
      {!loading && avgScore > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>Overall site SEO health</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor }}>{avgScore}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${avgScore}%`, background: scoreColor, transition: 'width 0.5s ease' }} />
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