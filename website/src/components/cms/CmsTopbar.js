// website/src/components/cms/CmsTopbar.js
'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES = {
  '/cms/dashboard':      'Dashboard',
  '/cms/pages':          'Pages',
  '/cms/blogs':          'Blog Posts',
  '/cms/disputes':       'Dispute Pages',
  '/cms/seo':            'SEO Dashboard',
  '/cms/seo/settings':   'SEO Settings',
  '/cms/seo/redirects':  'Redirects',
  '/cms/seo/sitemap':    'Sitemap',
  '/cms/media':          'Media Library',
};

export default function CmsTopbar() {
  const pathname = usePathname();

  // Find best matching title
  const title = Object.entries(PAGE_TITLES)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || 'CMS';

  return (
    <header style={{
      height: 52, flexShrink: 0,
      background: 'var(--color-background-primary)',
      borderBottom: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
    }}>
      <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* View live site */}
        <a
          href="https://raazimarzi.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12, color: 'var(--color-text-secondary)',
            textDecoration: 'none', padding: '5px 10px',
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          🌐 View live site
        </a>

        {/* User avatar placeholder */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--color-background-info)',
          color: 'var(--color-text-info)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600,
        }}>
          S
        </div>
      </div>
    </header>
  );
}