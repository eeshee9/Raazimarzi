'use client';
// website/src/components/seo/tabs/SchemaTab.jsx

import { useState } from 'react';

const SCHEMA_OPTIONS = [
  { value: 'none',          icon: '—',  label: 'None',          desc: 'No schema markup' },
  { value: 'Article',       icon: '📄', label: 'Article',       desc: 'Blog posts, dispute guides' },
  { value: 'FAQPage',       icon: '❓', label: 'FAQ Page',      desc: 'Pages with Q&A sections' },
  { value: 'LegalService',  icon: '⚖️', label: 'Legal Service', desc: 'Mediation, arbitration pages' },
  { value: 'HowTo',         icon: '🪜', label: 'How-To',        desc: 'Step-by-step process pages' },
  { value: 'LocalBusiness', icon: '🏢', label: 'Local Business',desc: 'Contact / about pages' },
  { value: 'Organization',  icon: '🌐', label: 'Organization',  desc: 'Homepage' },
];

const SCHEMA_FIELDS = {
  none: [],
  Article:       [{ key: 'author', label: 'Author name', type: 'text' }, { key: 'datePublished', label: 'Date published', type: 'text' }, { key: 'image', label: 'Article image URL', type: 'url' }],
  FAQPage:       [{ key: 'questions', label: 'FAQ questions', type: 'faq' }],
  LegalService:  [{ key: 'serviceType', label: 'Service type (e.g. Mediation)', type: 'text' }, { key: 'areaServed', label: 'Area served (e.g. India)', type: 'text' }, { key: 'provider', label: 'Provider name', type: 'text' }, { key: 'description', label: 'Description', type: 'textarea' }],
  HowTo:         [{ key: 'name', label: 'Process name', type: 'text' }, { key: 'totalTime', label: 'Total time (e.g. PT30M)', type: 'text' }, { key: 'steps', label: 'Steps (one per line)', type: 'textarea' }],
  LocalBusiness: [{ key: 'name', label: 'Business name', type: 'text' }, { key: 'telephone', label: 'Phone number', type: 'text' }, { key: 'addressLocality', label: 'City', type: 'text' }, { key: 'addressCountry', label: 'Country', type: 'text' }],
  Organization:  [{ key: 'name', label: 'Organization name', type: 'text' }, { key: 'url', label: 'Website URL', type: 'url' }, { key: 'logo', label: 'Logo URL', type: 'url' }, { key: 'description', label: 'Description', type: 'textarea' }],
};

function buildJsonLd(type, data) {
  if (!type || type === 'none') return null;
  const base = { '@context': 'https://schema.org', '@type': type };
  if (type === 'FAQPage') {
    const questions = data.questions || [];
    return { ...base, mainEntity: questions.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) };
  }
  if (type === 'HowTo') {
    const steps = String(data.steps || '').split('\n').filter(Boolean);
    return { ...base, name: data.name, totalTime: data.totalTime, step: steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })) };
  }
  return { ...base, ...data };
}

function FaqEditor({ value = [], onChange }) {
  const add    = () => onChange([...value, { q: '', a: '' }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i, field, text) => { const copy = [...value]; copy[i] = { ...copy[i], [field]: text }; onChange(copy); };
  const inp    = { width: '100%', padding: '7px 9px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 5, background: '#fff', color: '#0f172a', fontFamily: 'inherit', boxSizing: 'border-box' };
  return (
    <div>
      {value.map((item, i) => (
        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 8, background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>Q&A #{i + 1}</span>
            <button onClick={() => remove(i)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
          </div>
          <input value={item.q} onChange={e => update(i, 'q', e.target.value)} placeholder="Question" style={{ ...inp, marginBottom: 6 }} />
          <textarea value={item.a} onChange={e => update(i, 'a', e.target.value)} placeholder="Answer" rows={2} style={{ ...inp, resize: 'vertical' }} />
        </div>
      ))}
      <button onClick={add} style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 500, border: '1px dashed #e2e8f0', borderRadius: 6, background: 'transparent', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add question</button>
    </div>
  );
}

const input = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', color: '#0f172a', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

export function SchemaTab({ seo, onChange }) {
  const [showPreview, setShowPreview] = useState(false);
  const fields  = SCHEMA_FIELDS[seo.schemaType] || [];
  const jsonLd  = buildJsonLd(seo.schemaType, seo.schemaData);
  const jsonStr = jsonLd ? JSON.stringify(jsonLd, null, 2) : null;
  const updateField = (key, val) => onChange({ schemaData: { ...seo.schemaData, [key]: val } });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Schema type</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {SCHEMA_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onChange({ schemaType: opt.value, schemaData: {} })} style={{ padding: '8px 10px', textAlign: 'left', cursor: 'pointer', border: seo.schemaType === opt.value ? '2px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 7, background: seo.schemaType === opt.value ? '#f8fafc' : 'transparent', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 14, marginBottom: 1 }}>{opt.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{opt.label}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {fields.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Schema fields</p>
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>{f.label}</label>
              {f.type === 'faq' ? (
                <FaqEditor value={seo.schemaData.questions || []} onChange={val => updateField('questions', val)} />
              ) : f.type === 'textarea' ? (
                <textarea value={String(seo.schemaData[f.key] || '')} onChange={e => updateField(f.key, e.target.value)} rows={3} style={{ ...input, resize: 'vertical', minHeight: 60 }} />
              ) : (
                <input type={f.type} value={String(seo.schemaData[f.key] || '')} onChange={e => updateField(f.key, e.target.value)} style={input} />
              )}
            </div>
          ))}
        </div>
      )}

      {jsonStr && (
        <div>
          <button onClick={() => setShowPreview(p => !p)} style={{ width: '100%', padding: '8px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', color: '#64748b', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between' }}>
            <span>JSON-LD preview</span><span>{showPreview ? '▲' : '▼'}</span>
          </button>
          {showPreview && (
            <pre style={{ marginTop: 8, padding: 12, borderRadius: 6, fontSize: 11, lineHeight: 1.7, fontFamily: 'monospace', overflow: 'auto', maxHeight: 260, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', whiteSpace: 'pre' }}>{jsonStr}</pre>
          )}
        </div>
      )}

      {seo.schemaType === 'none' && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧩</div>
          Select a schema type above to add structured data.
        </div>
      )}
    </div>
  );
}