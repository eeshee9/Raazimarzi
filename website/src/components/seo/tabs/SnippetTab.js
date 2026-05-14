// components/seo/tabs/SnippetTab.jsx
'use client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'raazimarzi.com';

function CharCount({ value, min, max }) {
  const len  = value?.length || 0;
  const ok   = len >= min && len <= max;
  const low  = len > 0 && len < min;
  const high = len > max;
  const color = ok ? '#16a34a' : low ? '#d97706' : high ? '#dc2626' : '#94a3b8';
  const hint  = ok ? '✓' : low ? `${min - len} more` : high ? `${len - max} over` : `${min}–${max}`;
  return (
    <span style={{ fontSize: 11, color, marginLeft: 6, fontVariantNumeric: 'tabular-nums' }}>
      {len} / {max} {hint}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      {children}
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '0.5px solid var(--color-border-secondary)', borderRadius: 6,
  background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
  outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
  boxSizing: 'border-box',
};

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 72 };

export function SnippetTab({ seo, onChange }) {
  const breadcrumb   = `${SITE_URL} › ${(seo.slug || '').replace(/\//g, ' › ')}`;
  const displayTitle = seo.title       || 'Your page title will appear here';
  const displayDesc  = seo.description || 'Your meta description will appear here. Write a compelling 140–160 character summary.';

  return (
    <div>
      {/* SERP Preview */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Google preview
        </p>
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 10, padding: '14px 16px', background: 'var(--color-background-primary)', fontFamily: 'Georgia, serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif' }}>R</span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#202124', fontFamily: 'arial,sans-serif', lineHeight: 1.3 }}>RaaziMarzi</div>
              <div style={{ fontSize: 11, color: '#4d5156', fontFamily: 'arial,sans-serif', lineHeight: 1.2 }}>{breadcrumb}</div>
            </div>
          </div>
          <div style={{ fontSize: 19, color: '#1a0dab', lineHeight: 1.3, marginBottom: 4, fontFamily: 'arial,sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {displayTitle}
          </div>
          <div style={{ fontSize: 13, color: '#4d5156', lineHeight: 1.55, fontFamily: 'arial,sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {displayDesc}
          </div>
        </div>
      </div>

      {/* SEO Title */}
      <Field label={<>SEO Title <CharCount value={seo.title} min={50} max={60} /></>} hint="Include your focus keyword near the start. 50–60 characters ideal.">
        <input type="text" value={seo.title} onChange={e => onChange({ title: e.target.value })} placeholder="E.g. Property Dispute Resolution Online | RaaziMarzi" style={inputStyle} maxLength={70} />
      </Field>

      {/* Meta Description */}
      <Field label={<>Meta description <CharCount value={seo.description} min={140} max={160} /></>} hint="Compelling descriptions improve click-through rates from Google.">
        <textarea value={seo.description} onChange={e => onChange({ description: e.target.value })} placeholder="E.g. Resolve property disputes online through RaaziMarzi's mediation platform. Fast, affordable, legally valid. Start your case today." style={textareaStyle} maxLength={180} />
      </Field>

      {/* Slug */}
      <Field label="URL slug" hint="Lowercase and hyphens only. Keyword-rich slugs rank better.">
        <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, overflow: 'hidden', background: 'var(--color-background-primary)' }}>
          <span style={{ padding: '8px 10px', fontSize: 13, color: 'var(--color-text-tertiary)', background: 'var(--color-background-secondary)', borderRight: '0.5px solid var(--color-border-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {SITE_URL}/
          </span>
          <input type="text" value={seo.slug} onChange={e => onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, '') })} placeholder="disputes/property-rental" style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }} />
        </div>
      </Field>

      {/* Focus Keyword */}
      <Field label="Focus keyword" hint="The primary keyword this page targets. Powers all 12 analysis checks.">
        <input type="text" value={seo.focusKeyword} onChange={e => onChange({ focusKeyword: e.target.value })} placeholder="E.g. property dispute resolution india" style={inputStyle} />
      </Field>

      {/* Canonical URL */}
      <Field label="Canonical URL" hint="Leave blank to auto-generate from slug. Override only if content exists at multiple URLs.">
        <input type="url" value={seo.canonical} onChange={e => onChange({ canonical: e.target.value })} placeholder={`https://${SITE_URL}/${seo.slug}`} style={inputStyle} />
      </Field>
    </div>
  );
}