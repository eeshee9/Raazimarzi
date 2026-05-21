'use client';
// website/src/components/seo/tabs/SocialTab.jsx

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'raazimarzi.com';

const input = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', color: '#0f172a',
  outline: 'none', fontFamily: 'inherit',
  lineHeight: 1.5, boxSizing: 'border-box',
};

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function OgCard({ title, description, image, url }) {
  return (
    <div style={{ border: '1px solid #dddfe2', overflow: 'hidden', marginBottom: 4, fontFamily: 'Helvetica, Arial, sans-serif', background: '#f0f2f5', borderRadius: 4 }}>
      <div style={{ width: '100%', height: 130, background: image ? `url(${image}) center/cover` : '#e4e6ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!image && <span style={{ fontSize: 12, color: '#8a8d91' }}>No OG image set</span>}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #dddfe2' }}>
        <div style={{ fontSize: 11, color: '#8a8d91', textTransform: 'uppercase', marginBottom: 3 }}>{url || SITE_URL}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1e21', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
          {title || 'OG title will appear here'}
        </div>
        <div style={{ fontSize: 13, color: '#606770', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {description || 'OG description will appear here when shared on Facebook or LinkedIn.'}
        </div>
      </div>
    </div>
  );
}

function TwitterCard({ title, description, image, card }) {
  const isLarge = card === 'summary_large_image';
  return (
    <div style={{ border: '1px solid #e1e8ed', borderRadius: 14, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#fff' }}>
      {isLarge && (
        <div style={{ width: '100%', height: 120, background: image ? `url(${image}) center/cover` : '#e6ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!image && <span style={{ fontSize: 12, color: '#aab8c2' }}>No Twitter image set</span>}
        </div>
      )}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 10 }}>
        {!isLarge && (
          <div style={{ width: 70, height: 70, borderRadius: 4, flexShrink: 0, background: image ? `url(${image}) center/cover` : '#e6ecf0' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#14171a', marginBottom: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {title || 'Twitter card title'}
          </div>
          <div style={{ fontSize: 12, color: '#657786', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {description || 'Twitter card description will appear here.'}
          </div>
          <div style={{ fontSize: 11, color: '#aab8c2', marginTop: 4 }}>{SITE_URL}</div>
        </div>
      </div>
    </div>
  );
}

export function SocialTab({ seo, onChange }) {
  const ogTitle = seo.og.title       || seo.title;
  const ogDesc  = seo.og.description || seo.description;
  const twTitle = seo.twitter.title  || seo.title;
  const twDesc  = seo.twitter.description || seo.description;

  return (
    <div>
      {/* Facebook / LinkedIn */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#1877f2', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Facebook / LinkedIn preview
        </p>
        <OgCard title={ogTitle} description={ogDesc} image={seo.og.image} url={seo.slug ? `${SITE_URL}/${seo.slug}` : SITE_URL} />
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Falls back to main title/description if left blank.</p>

        <Field label="OG title override" hint="Max 60 chars recommended.">
          <input type="text" value={seo.og.title} onChange={e => onChange({ og: { ...seo.og, title: e.target.value } })} placeholder={seo.title || 'Leave blank to use SEO title'} style={input} maxLength={80} />
        </Field>
        <Field label="OG description override">
          <textarea value={seo.og.description} onChange={e => onChange({ og: { ...seo.og, description: e.target.value } })} placeholder={seo.description || 'Leave blank to use meta description'} style={{ ...input, resize: 'vertical', minHeight: 64 }} maxLength={200} />
        </Field>
        <Field label="OG image URL" hint="Recommended: 1200×630px. Used on Facebook, LinkedIn, WhatsApp.">
          <input type="url" value={seo.og.image} onChange={e => onChange({ og: { ...seo.og, image: e.target.value } })} placeholder="https://raazimarzi.com/og/page-name.jpg" style={input} />
        </Field>
      </div>

      {/* Twitter / X */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#000', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          X (Twitter) preview
        </p>
        <TwitterCard title={twTitle} description={twDesc} image={seo.twitter.image || seo.og.image} card={seo.twitter.card} />
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 12px' }}>Falls back to OG image if Twitter image not set.</p>

        <Field label="Card type">
          <select value={seo.twitter.card} onChange={e => onChange({ twitter: { ...seo.twitter, card: e.target.value } })} style={input}>
            <option value="summary_large_image">Large image card (recommended)</option>
            <option value="summary">Small summary card</option>
          </select>
        </Field>
        <Field label="Twitter title override">
          <input type="text" value={seo.twitter.title} onChange={e => onChange({ twitter: { ...seo.twitter, title: e.target.value } })} placeholder={seo.title || 'Leave blank to use SEO title'} style={input} maxLength={70} />
        </Field>
        <Field label="Twitter image URL" hint="Recommended: 1200×628px. Falls back to OG image.">
          <input type="url" value={seo.twitter.image} onChange={e => onChange({ twitter: { ...seo.twitter, image: e.target.value } })} placeholder={seo.og.image || 'https://raazimarzi.com/twitter/page-name.jpg'} style={input} />
        </Field>
      </div>
    </div>
  );
}