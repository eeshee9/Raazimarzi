'use client';
// website/src/components/seo/ScoreGauge.jsx
// Pure UI component — no backend imports

export function ScoreGauge({ score = 0, size = 48 }) {
  const r            = (size / 2) - 4;
  const circumference = 2 * Math.PI * r;
  const offset       = circumference - (score / 100) * circumference;
  const color        = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const label        = score >= 80 ? 'Good'    : score >= 50 ? 'OK'      : 'Poor';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={3} style={{ opacity: 0.1 }} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: size < 56 ? 12 : 16, fontWeight: 600, color }}>{score}</span>
        {size >= 56 && <span style={{ fontSize: 10, color, opacity: 0.8, marginTop: 1 }}>{label}</span>}
      </div>
    </div>
  );
}