// components/seo/tabs/AnalysisTab.jsx
'use client';

import { ScoreGauge } from '../ScoreGauge';

function StatusDot({ status }) {
  const config = {
    pass:    { color: '#16a34a', bg: '#dcfce7', label: '✓' },
    fail:    { color: '#dc2626', bg: '#fee2e2', label: '✕' },
    warning: { color: '#d97706', bg: '#fef3c7', label: '!' },
    skip:    { color: '#94a3b8', bg: '#f1f5f9', label: '–' },
  }[status] || { color: '#94a3b8', bg: '#f1f5f9', label: '–' };

  return (
    <div style={{ width: 20, height: 20, borderRadius: '50%', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {config.label}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const config = {
    critical:    { bg: '#fee2e2', color: '#dc2626', label: 'Critical' },
    important:   { bg: '#fef3c7', color: '#d97706', label: 'Important' },
    recommended: { bg: '#f0fdf4', color: '#16a34a', label: 'Recommended' },
  }[severity] || { bg: '#f1f5f9', color: '#64748b', label: severity };

  return (
    <span style={{ fontSize: 10, fontWeight: 500, background: config.bg, color: config.color, padding: '1px 6px', borderRadius: 10 }}>
      {config.label}
    </span>
  );
}

function CheckRow({ check }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <StatusDot status={check.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{check.label}</span>
          <SeverityBadge severity={check.severity} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {check.message}
        </p>
      </div>
    </div>
  );
}

export function AnalysisTab({ seo, checks = [], score = 0, onChange }) {
  const critical    = checks.filter(c => c.severity === 'critical'    && c.status !== 'skip');
  const important   = checks.filter(c => c.severity === 'important'   && c.status !== 'skip');
  const recommended = checks.filter(c => c.severity === 'recommended' && c.status !== 'skip');
  const failCount   = checks.filter(c => c.status === 'fail').length;
  const passCount   = checks.filter(c => c.status === 'pass').length;
  const skipped     = checks.filter(c => c.status === 'skip');

  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Excellent SEO' : score >= 50 ? 'Needs improvement' : 'Needs work';

  return (
    <div>
      {/* Score summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, borderRadius: 10, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', marginBottom: 20 }}>
        <ScoreGauge score={score} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: scoreColor, marginBottom: 2 }}>{scoreLabel}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {passCount} passed · {failCount} failed · {skipped.length} skipped
          </div>
          <div style={{ height: 4, background: 'var(--color-border-tertiary)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', borderRadius: 2, width: `${score}%`, background: scoreColor, transition: 'width 0.4s ease, background 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* No keyword warning */}
      {!seo.focusKeyword && (
        <div style={{ background: '#fef3c7', border: '0.5px solid #fbbf24', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
          <strong>Set a focus keyword</strong> in the Snippet tab to unlock keyword-based checks.
        </div>
      )}

      {/* Critical */}
      {critical.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Critical issues</p>
          {critical.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}

      {/* Important */}
      {important.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Important</p>
          {important.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Recommended</p>
          {recommended.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}

      {/* Empty state */}
      {checks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          Start editing fields in the Snippet tab to see your SEO analysis.
        </div>
      )}
    </div>
  );
}