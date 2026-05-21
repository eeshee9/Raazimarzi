'use client';
// website/src/app/cms/layout.js
// Shared layout for all CMS pages — sidebar + topbar
// The SEO team sees this on every CMS page after login

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

const NAV = [
  {
    section: 'Content',
    items: [
      { href: '/cms/dashboard', icon: '🏠', label: 'Dashboard' },
      { href: '/cms/pages',     icon: '📄', label: 'Pages' },
    ],
  },
  {
    section: 'SEO',
    items: [
      { href: '/cms/seo',           icon: '📊', label: 'SEO Dashboard' },
      { href: '/cms/seo/redirects', icon: '↪️',  label: 'Redirects' },
      { href: '/cms/seo/sitemap',   icon: '🗺️',  label: 'Sitemap' },
    ],
  },
];

function Sidebar({ onLogout }) {
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/cms/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>RaaziMarzi</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Content Management</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 4 }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                fontSize: 13, fontWeight: isActive(item.href) ? 500 : 400,
                color: isActive(item.href) ? '#0f172a' : '#64748b',
                background: isActive(item.href) ? '#f8fafc' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={onLogout}
          style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function CmsLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  // Page title from pathname
  const titles = {
    '/cms/dashboard':    'Dashboard',
    '/cms/pages':        'Pages',
    '/cms/seo':          'SEO Dashboard',
    '/cms/seo/redirects':'Redirects',
    '/cms/seo/sitemap':  'Sitemap',
  };
  const title = Object.entries(titles)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || 'CMS';

  // Check auth on every CMS page load
  useEffect(() => {
    if (pathname === '/cms/login') { setChecking(false); return; }
    fetch(`${API}/api/cms/auth/me`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(); setChecking(false); })
      .catch(() => router.push('/cms/login'));
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch(`${API}/api/cms/auth/logout`, { method: 'POST', credentials: 'include' });
    router.push('/cms/login');
  };

  // Don't show sidebar on login page
  if (pathname === '/cms/login') return <>{children}</>;

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e2e8f0', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Sidebar onLogout={handleLogout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 52, flexShrink: 0, background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>{title}</h1>
          <a href="https://raazimarzi.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            🌐 View live site
          </a>
        </header>
        {/* Page content */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}