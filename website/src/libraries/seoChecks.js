// libraries/seoChecks.js
// All 12 SEO analyzer checks — plain JS, no dependencies
// Each check: { id, label, severity, run(ctx) → { status, message } }

const SEVERITY_WEIGHT = { critical: 3, important: 2, recommended: 1 };

// ─── Individual checks ────────────────────────────────────────────

const checks = [

  // ── Title checks (Critical) ──────────────────────────────────
  {
    id: 'title-present',
    label: 'Title tag is set',
    severity: 'critical',
    run({ seo }) {
      const ok = Boolean(seo.title?.trim());
      return {
        status: ok ? 'pass' : 'fail',
        message: ok ? 'Title tag is set. ✓' : 'You must set a title tag for this page.',
      };
    },
  },
  {
    id: 'title-length',
    label: 'Title length (50–60 chars)',
    severity: 'critical',
    run({ seo }) {
      if (!seo.title) return { status: 'skip', message: 'Set a title first.' };
      const len = seo.title.length;
      if (len >= 50 && len <= 60) return { status: 'pass', message: `Title is ${len} characters — perfect range. ✓` };
      if (len < 50) return { status: 'fail', message: `Title too short (${len} chars). Add ${50 - len} more characters.` };
      return { status: 'fail', message: `Title too long (${len} chars). Shorten by ${len - 60} characters.` };
    },
  },
  {
    id: 'keyword-in-title',
    label: 'Focus keyword in title',
    severity: 'critical',
    run({ seo }) {
      if (!seo.focusKeyword) return { status: 'skip', message: 'Set a focus keyword in the Snippet tab.' };
      const found = seo.title?.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return {
        status: found ? 'pass' : 'fail',
        message: found
          ? `"${seo.focusKeyword}" found in title. ✓`
          : `Add "${seo.focusKeyword}" to your title tag.`,
      };
    },
  },

  // ── Description checks (Critical) ────────────────────────────
  {
    id: 'description-present',
    label: 'Meta description is set',
    severity: 'critical',
    run({ seo }) {
      const ok = Boolean(seo.description?.trim());
      return {
        status: ok ? 'pass' : 'fail',
        message: ok ? 'Meta description is set. ✓' : 'You must write a meta description.',
      };
    },
  },
  {
    id: 'description-length',
    label: 'Description length (140–160 chars)',
    severity: 'critical',
    run({ seo }) {
      if (!seo.description) return { status: 'skip', message: 'Set a description first.' };
      const len = seo.description.length;
      if (len >= 140 && len <= 160) return { status: 'pass', message: `Description is ${len} characters — ideal. ✓` };
      if (len < 140) return { status: 'fail', message: `Description too short (${len} chars). Add ${140 - len} more characters.` };
      return { status: 'fail', message: `Description too long (${len} chars). Shorten by ${len - 160} characters.` };
    },
  },
  {
    id: 'keyword-in-description',
    label: 'Focus keyword in description',
    severity: 'critical',
    run({ seo }) {
      if (!seo.focusKeyword) return { status: 'skip', message: 'Set a focus keyword in the Snippet tab.' };
      const found = seo.description?.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return {
        status: found ? 'pass' : 'fail',
        message: found
          ? `"${seo.focusKeyword}" found in description. ✓`
          : `Include "${seo.focusKeyword}" in your meta description.`,
      };
    },
  },

  // ── Keyword checks (Important) ────────────────────────────────
  {
    id: 'keyword-in-h1',
    label: 'Focus keyword in H1 heading',
    severity: 'important',
    run({ content, seo }) {
      if (!seo.focusKeyword) return { status: 'skip', message: 'Set a focus keyword.' };
      if (!content.h1) return { status: 'fail', message: 'No H1 heading found. Add one with the focus keyword.' };
      const found = content.h1.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return {
        status: found ? 'pass' : 'fail',
        message: found
          ? `"${seo.focusKeyword}" found in H1. ✓`
          : `Add "${seo.focusKeyword}" to your H1 heading.`,
      };
    },
  },
  {
    id: 'keyword-in-slug',
    label: 'Focus keyword in URL slug',
    severity: 'important',
    run({ seo }) {
      if (!seo.focusKeyword || !seo.slug) return { status: 'skip' };
      const words = seo.focusKeyword.toLowerCase().split(/\s+/);
      const found = words.some(w => seo.slug.includes(w));
      return {
        status: found ? 'pass' : 'fail',
        message: found
          ? 'Focus keyword appears in the URL slug. ✓'
          : `Include keywords in the URL slug (e.g. "disputes/property-rental").`,
      };
    },
  },
  {
    id: 'keyword-in-first-para',
    label: 'Focus keyword in first paragraph',
    severity: 'important',
    run({ content, seo }) {
      if (!seo.focusKeyword) return { status: 'skip' };
      if (!content.paragraphs?.length) return { status: 'fail', message: 'No paragraphs found. Add content to this page.' };
      const found = content.paragraphs[0].toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return {
        status: found ? 'pass' : 'fail',
        message: found
          ? 'Keyword appears in the opening paragraph. ✓'
          : 'Mention your focus keyword in the first paragraph.',
      };
    },
  },
  {
    id: 'content-length',
    label: 'Content length (300+ words)',
    severity: 'important',
    run({ content }) {
      const wc = content.wordCount || 0;
      if (wc >= 600) return { status: 'pass', message: `${wc} words — excellent content depth. ✓` };
      if (wc >= 300) return { status: 'pass', message: `${wc} words — meets minimum. Aim for 600+ for better ranking.` };
      if (wc > 0)    return { status: 'fail', message: `Only ${wc} words. Add more content — aim for at least 300 words.` };
      return { status: 'skip', message: 'No content detected for word count.' };
    },
  },

  // ── Image + link checks (Important / Recommended) ─────────────
  {
    id: 'image-alt-text',
    label: 'All images have alt text',
    severity: 'important',
    run({ content }) {
      if (!content.images?.length) return { status: 'skip', message: 'No images found on this page.' };
      const missing = content.images.filter(img => !img.alt?.trim());
      if (missing.length === 0) return { status: 'pass', message: `All ${content.images.length} image(s) have alt text. ✓` };
      return { status: 'fail', message: `${missing.length} of ${content.images.length} image(s) missing alt text. Add descriptive alt attributes.` };
    },
  },
  {
    id: 'internal-links',
    label: 'At least 1 internal link',
    severity: 'recommended',
    run({ content }) {
      const count = content.internalLinks?.length || 0;
      if (count >= 3) return { status: 'pass', message: `${count} internal links — great internal linking. ✓` };
      if (count >= 1) return { status: 'pass', message: `${count} internal link(s) found. Add 2–3 more for better crawlability.` };
      return { status: 'fail', message: 'No internal links. Link to at least 3 related pages.' };
    },
  },
  {
    id: 'keyword-density',
    label: 'Keyword density (0.5%–2.5%)',
    severity: 'recommended',
    run({ content, seo }) {
      if (!seo.focusKeyword || !content.wordCount) return { status: 'skip' };
      const text  = content.paragraphs.join(' ').toLowerCase();
      const kw    = seo.focusKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (text.match(new RegExp(kw, 'g')) || []).length;
      const density = (count / content.wordCount) * 100;
      if (density >= 0.5 && density <= 2.5) return { status: 'pass', message: `Keyword density is ${density.toFixed(1)}% — ideal range. ✓` };
      if (density < 0.5) return { status: 'fail', message: `Keyword density too low (${density.toFixed(1)}%). Use the keyword more naturally.` };
      return { status: 'fail', message: `Keyword density too high (${density.toFixed(1)}%). Avoid keyword stuffing.` };
    },
  },
];

// ─── Orchestrator ─────────────────────────────────────────────────

/**
 * Run all checks and return results array
 * @param {{ content: object, seo: object, context: object }} ctx
 * @returns {Array} check results with id, label, severity, status, message
 */
export function runAllChecks({ content, seo, context }) {
  return checks.map(check => {
    try {
      const result = check.run({ content, seo, context });
      return {
        id:       check.id,
        label:    check.label,
        severity: check.severity,
        status:   result.status || 'skip',
        message:  result.message || '',
      };
    } catch (e) {
      return { id: check.id, label: check.label, severity: check.severity, status: 'skip', message: 'Check failed.' };
    }
  });
}

/**
 * Calculate weighted score from check results
 * critical=3, important=2, recommended=1
 * @param {Array} results
 * @returns {number} 0–100
 */
export function calculateScore(results) {
  let passed = 0, total = 0;
  results.forEach(r => {
    if (r.status === 'skip') return;
    const weight = SEVERITY_WEIGHT[r.severity] || 1;
    total  += weight;
    if (r.status === 'pass') passed += weight;
  });
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}