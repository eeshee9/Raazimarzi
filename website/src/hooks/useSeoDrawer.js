// hooks/useSeoDrawer.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_SEO = {
  title: '',
  description: '',
  slug: '',
  canonical: '',
  focusKeyword: '',
  secondaryKeywords: [],
  robots: { index: true, follow: true },
  og: { title: '', description: '', image: '' },
  twitter: { card: 'summary_large_image', title: '', description: '', image: '' },
  schemaType: 'none',
  schemaData: {},
  score: 0,
  checks: [],
  customMetaTags: [],
};

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function useSeoDrawer(pageId) {
  const [seo, setSeo]         = useState(EMPTY_SEO);
  const [tab, setTab]         = useState('snippet');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [error, setError]     = useState(null);
  const [saved, setSaved]     = useState(false);
  const debounceRef           = useRef(null);

  // Load SEO data when pageId changes
  useEffect(() => {
    if (!pageId) { setSeo(EMPTY_SEO); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/seo/page/${pageId}`)
      .then(r => r.json())
      .then(data => {
        setSeo({ ...EMPTY_SEO, ...data.seo });
        setDirty(false);
      })
      .catch(() => setError('Failed to load SEO data'))
      .finally(() => setLoading(false));
  }, [pageId]);

  // Debounced analyzer — fires 350ms after any field change
  const runAnalysis = useCallback(
    debounce(async (updated) => {
      try {
        const res = await fetch('/api/seo/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seo: updated, pageId }),
        });
        const data = await res.json();
        setSeo(prev => ({ ...prev, score: data.score, checks: data.checks }));
      } catch {
        // silent fail — analysis is non-critical
      }
    }, 350),
    [pageId]
  );

  // Update top-level fields
  const updateSeo = useCallback((patch) => {
    setSeo(prev => {
      const updated = { ...prev, ...patch };
      setDirty(true);
      runAnalysis(updated);
      return updated;
    });
  }, [runAnalysis]);

  // Update nested objects like og, twitter, robots
  const updateNested = useCallback((key, patch) => {
    setSeo(prev => {
      const updated = {
        ...prev,
        [key]: { ...prev[key], ...patch },
      };
      setDirty(true);
      runAnalysis(updated);
      return updated;
    });
  }, [runAnalysis]);

  // Save to MongoDB via API
  const save = useCallback(async () => {
    if (!pageId || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/seo/page/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seo }),
      });
      if (!res.ok) throw new Error('Save failed');
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [pageId, seo, dirty]);

  return {
    seo, tab, loading, saving, dirty, error, saved,
    setTab, updateSeo, updateNested, save,
  };
}