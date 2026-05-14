// website/src/app/cms/login/page.js
// SEO team login — completely separate from application/ admin login
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CmsLogin() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/cms/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Cookie is set by the API — redirect to dashboard
      router.push('/cms/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14,
    border: '0.5px solid #e2e8f0', borderRadius: 8,
    outline: 'none', fontFamily: 'inherit',
    background: '#fff', color: '#0f172a',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff', borderRadius: 16,
        border: '0.5px solid #e2e8f0',
        padding: '36px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>RaaziMarzi</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Content Management System</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '0.5px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="seo@raazimarzi.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              fontSize: 14, fontWeight: 600,
              background: loading ? '#94a3b8' : '#0f172a',
              color: '#fff', border: 'none', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in to CMS'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          This portal is for the RaaziMarzi SEO & content team only.
        </p>
      </div>
    </div>
  );
}