// website/src/components/cms/CmsSidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    section: 'Content',
    items: [
      { href: '/cms/dashboard', icon: '🏠', label: 'Dashboard' },
      { href: '/cms/pages',     icon: '📄', label: 'Pages' },
      { href: '/cms/blogs',     icon: '✍️',  label: 'Blog Posts' },
      { href: '/cms/disputes',  icon: '⚖️',  label: 'Dispute Pages' },
    ],
  },
  {
    section: 'SEO',
    items: [
      { href: '/cms/seo',              icon: '📊', label: 'SEO Dashboard' },
      { href: '/cms/seo/settings',     icon: '⚙️',  label: 'SEO Settings' },
      { href: '/cms/seo/redirects',    icon: '↪️',  label: 'Redirects' },
      { href: '/cms/seo/sitemap',      icon: '🗺️',  label: 'Sitemap' },
    ],
  },
  {
    section: 'Media',
    items: [
      { href: '/cms/media', icon: '🖼️', label: 'Media Library' },
    ],
  },
];

export default function CmsSidebar() {
  const pathname = usePathname();

  const isActive = (href) =>
    href === '/cms/dashboard'
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--color-background-primary)',
      borderRight: '0.5px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          RaaziMarzi
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          Content Management
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '0 10px', marginBottom: 4,
            }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                  fontSize: 13, fontWeight: isActive(item.href) ? 500 : 400,
                  color: isActive(item.href)
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                  background: isActive(item.href)
                    ? 'var(--color-background-secondary)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        fontSize: 12, color: 'var(--color-text-tertiary)',
      }}>
        <Link href="/cms/logout" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
          Sign out
        </Link>
      </div>
    </aside>
  );
}