'use client';
// website/src/components/seo/tabs/AdvancedTab.jsx

import { useState } from 'react';

const input = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', color: '#0f172a',
  outline: 'none', fontFamily: 'inherit',
  lineHeight: 1.5, boxSizing: 'border-box',
};

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
          background: checked ? '#16a34a' : '#e2e8f0',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

function CustomMetaEditor({ tags = [], onChange }) {
  const add    = () => onChange([...tags, { name: '', content: '' }]);
  const remove = (i) => onChange(tags.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const copy = [...tags]; copy[i] = { ...copy[i], [field]: val }; onChange(copy); };

  return (
    <div>
      {tags.map((tag, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={tag.name} onChange={e => update(i, 'name', e.target.value)} placeholder="name" style={{ ...input, flex: '0 0 38%' }} />
          <input value={tag.content} onChange={e => update(i, 'content', e.target.value)} placeholder="content" style={{ ...input, flex: 1 }} />
          <button onClick={() => remove(i)} style={{ padding: '4px 8px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '7px', fontSize: 12, fontWeight: 500, border: '1px dashed #e2e8f0', borderRadius: 6, background: 'transparent', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
        + Add meta tag
      </button>
    </div>
  );
}

export function AdvancedTab({ seo, onChange }) {
  const [kwInput, setKwInput] = useState('');

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw) return;
    if (!seo.secondaryKeywords.includes(kw)) {
      onChange({ secondaryKeywords: [...seo.secondaryKeywords, kw] });
    }
    setKwInput('');
  };

  const removeKeyword = (kw) => onChange({ secondaryKeywords: seo.secondaryKeywords.filter(k => k !== kw) });

  const robotsStr = [
    seo.robots.index  ? 'index'   : 'noindex',
    seo.robots.follow ? 'follow'  : 'nofollow',
  ].join(', ');

  return (
    <div>
      {/* Robots meta */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Robots meta</p>
        <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, marginBottom: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
          {`<meta name="robots" content="${robotsStr}" />`}
        </div>

        <Toggle
          label="Index this page"
          hint="Turn OFF for login, register, dashboard, staging pages."
          checked={seo.robots.index}
          onChange={val => onChange({ robots: { ...seo.robots, index: val } })}
        />
        <Toggle
          label="Follow links on this page"
          hint="Turn OFF to prevent crawlers following outbound links."
          checked={seo.robots.follow}
          onChange={val => onChange({ robots: { ...seo.robots, follow: val } })}
        />

        {!seo.robots.index && (
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, fontSize: 12, background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24', lineHeight: 1.5 }}>
            ⚠️ This page will NOT appear in search results. Make sure this is intentional.
          </div>
        )}
      </div>

      {/* Secondary keywords */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Secondary keywords</p>

        {seo.secondaryKeywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {seo.secondaryKeywords.map(kw => (
              <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                {kw}
                <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: 11, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="Type keyword and press Enter"
            style={{ ...input, flex: 1 }}
          />
          <button onClick={addKeyword} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Add
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>Supporting keywords for this page. Max 2–3 recommended.</p>
      </div>

      {/* Custom meta tags */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Custom meta tags</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.5 }}>
          For edge cases — e.g. <code style={{ fontSize: 11 }}>google-site-verification</code>, <code style={{ fontSize: 11 }}>theme-color</code>.
        </p>
        <CustomMetaEditor
          tags={seo.customMetaTags || []}
          onChange={tags => onChange({ customMetaTags: tags })}
        />
      </div>
    </div>
  );
}