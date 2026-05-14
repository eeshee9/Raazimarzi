// website/src/app/cms/layout.js
// Shared layout for all CMS pages — sidebar + topbar

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CmsSidebar from '@/components/cms/CmsSidebar';
import CmsTopbar  from '@/components/cms/CmsTopbar';

export const metadata = {
  title: 'RaaziMarzi CMS',
  robots: { index: false, follow: false }, // never index CMS pages
};

export default function CmsLayout({ children }) {
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--color-background-secondary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Sidebar */}
      <CmsSidebar />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <CmsTopbar />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}