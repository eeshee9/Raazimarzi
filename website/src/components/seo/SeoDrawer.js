// components/seo/SeoDrawer.jsx
// Main SEO Drawer — slides in from the right of your page editor
// Usage: <SeoDrawer pageId={page._id} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
'use client';

import { useEffect, useRef } from 'react';
import { useSeoDrawer }  from '@/hooks/useSeoDrawer';
import { ScoreGauge }    from './ScoreGauge';
import { SnippetTab }    from './tabs/SnippetTab';
import { AnalysisTab }   from './tabs/AnalysisTab';
import { SchemaTab }     from './tabs/SchemaTab';
import { SocialTab }     from './tabs/SocialTab';
import { AdvancedTab }   from './tabs/AdvancedTab';

const TABS = [
  { id: 'snippet',  label: 'Snippet',  icon: '🔍' },
  { id: 'analysis', label: 'Analysis', icon: '📊' },
  { id: 'schema',   label: 'Schema',   icon: '🧩' },
  { id: 'social',   label: 'Social',   icon: '📱' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️' },
];

export function SeoDrawer({ pageId, open, onClose }) {
  const {
    seo, tab, loading, saving, dirty, error, saved,
    setTab, updateSeo, save,
  } = useSeoDrawer(open ? pageId : null);

  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const scoreColor =
    seo.score >= 80 ? '#16a34a' :
    seo.score >= 50 ? '#d97706' :
    '#dc2626';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)',
          animation: 'seoFadeIn 0.15s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="SEO Settings"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: '100vw',
          background: 'var(--color-background-primary)',
          borderLeft: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', flexDirection: 'column',
          zIndex: 999,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
          animation: 'seoSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>SEO Settings</div>
            {seo.title && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seo.title}
              </div>
            )}
          </div>
          {!loading && <ScoreGauge score={seo.score} size={44} />}
          <button
            onClick={onClose}
            aria-label="Close SEO drawer"
            style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid var(--color-border-secondary)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* ── Tabs bar ── */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '8px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                color: tab === t.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: tab === t.id ? 600 : 400, whiteSpace: 'nowrap' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--color-text-tertiary)' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--color-border-secondary)', borderTopColor: 'var(--color-text-primary)', borderRadius: '50%', animation: 'seoSpin 0.7s linear infinite' }} />
              <span style={{ fontSize: 13 }}>Loading SEO data…</span>
            </div>
          ) : (
            <>
              {tab === 'snippet'  && <SnippetTab  seo={seo} onChange={updateSeo} />}
              {tab === 'analysis' && <AnalysisTab seo={seo} checks={seo.checks} score={seo.score} onChange={updateSeo} />}
              {tab === 'schema'   && <SchemaTab   seo={seo} onChange={updateSeo} />}
              {tab === 'social'   && <SocialTab   seo={seo} onChange={updateSeo} />}
              {tab === 'advanced' && <AdvancedTab seo={seo} onChange={updateSeo} />}
            </>
          )}
        </div>

        {/* ── Footer: error + save ── */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, background: 'var(--color-background-primary)' }}>
          {error && (
            <div style={{ marginBottom: 8, padding: '7px 10px', borderRadius: 6, fontSize: 12, background: '#fee2e2', color: '#dc2626', border: '0.5px solid #fca5a5', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {/* Score bar */}
          {!loading && seo.score > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 3, background: 'var(--color-border-tertiary)', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${seo.score}%`, background: scoreColor, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: 11, color: scoreColor, fontWeight: 600, minWidth: 32 }}>{seo.score}%</span>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving || !dirty || loading}
            style={{
              width: '100%', padding: '10px 16px',
              fontSize: 13, fontWeight: 600,
              cursor: saving || !dirty ? 'not-allowed' : 'pointer',
              borderRadius: 8, border: 'none', fontFamily: 'inherit',
              background: saved ? '#16a34a' : dirty ? 'var(--color-text-primary)' : 'var(--color-background-secondary)',
              color: saved || dirty ? '#fff' : 'var(--color-text-tertiary)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saving ? (
              <>
                <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'seoSpin 0.7s linear infinite' }} />
                Saving…
              </>
            ) : saved ? '✓ Saved!' : dirty ? 'Save SEO settings' : 'No changes'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes seoSlideIn {
          from { transform: translateX(100%); opacity: 0.8; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes seoFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes seoSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}