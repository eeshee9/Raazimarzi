// server/src/services/seoAnalyzer.service.js
const SEVERITY_WEIGHT = { critical: 3, important: 2, recommended: 1 };

const CHECKS = [
  // ── Critical ──────────────────────────────────────────────────
  {
    id: "title-present", label: "Title tag is set", severity: "critical",
    run({ seo }) {
      const ok = Boolean(seo.title?.trim());
      return { status: ok ? "pass" : "fail", message: ok ? "Title tag is set. ✓" : "You must set a title tag." };
    },
  },
  {
    id: "title-length", label: "Title length (50–60 chars)", severity: "critical",
    run({ seo }) {
      if (!seo.title) return { status: "skip", message: "Set a title first." };
      const len = seo.title.length;
      if (len >= 50 && len <= 60) return { status: "pass", message: `Title is ${len} chars — perfect. ✓` };
      if (len < 50) return { status: "fail", message: `Too short (${len} chars). Add ${50 - len} more.` };
      return { status: "fail", message: `Too long (${len} chars). Shorten by ${len - 60}.` };
    },
  },
  {
    id: "keyword-in-title", label: "Focus keyword in title", severity: "critical",
    run({ seo }) {
      if (!seo.focusKeyword) return { status: "skip", message: "Set a focus keyword first." };
      const found = seo.title?.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return { status: found ? "pass" : "fail", message: found ? `"${seo.focusKeyword}" found in title. ✓` : `Add "${seo.focusKeyword}" to your title.` };
    },
  },
  {
    id: "description-present", label: "Meta description is set", severity: "critical",
    run({ seo }) {
      const ok = Boolean(seo.description?.trim());
      return { status: ok ? "pass" : "fail", message: ok ? "Meta description is set. ✓" : "You must write a meta description." };
    },
  },
  {
    id: "description-length", label: "Description length (140–160 chars)", severity: "critical",
    run({ seo }) {
      if (!seo.description) return { status: "skip", message: "Set a description first." };
      const len = seo.description.length;
      if (len >= 140 && len <= 160) return { status: "pass", message: `Description is ${len} chars — ideal. ✓` };
      if (len < 140) return { status: "fail", message: `Too short (${len} chars). Add ${140 - len} more.` };
      return { status: "fail", message: `Too long (${len} chars). Shorten by ${len - 160}.` };
    },
  },
  {
    id: "keyword-in-description", label: "Focus keyword in description", severity: "critical",
    run({ seo }) {
      if (!seo.focusKeyword) return { status: "skip", message: "Set a focus keyword first." };
      const found = seo.description?.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return { status: found ? "pass" : "fail", message: found ? `"${seo.focusKeyword}" in description. ✓` : `Add "${seo.focusKeyword}" to your description.` };
    },
  },

  // ── Important ─────────────────────────────────────────────────
  {
    id: "keyword-in-slug", label: "Focus keyword in URL slug", severity: "important",
    run({ seo }) {
      if (!seo.focusKeyword || !seo.slug) return { status: "skip" };
      const words = seo.focusKeyword.toLowerCase().split(/\s+/);
      const found = words.some(w => seo.slug.includes(w));
      return { status: found ? "pass" : "fail", message: found ? "Keyword in URL slug. ✓" : "Add keyword words to the URL slug." };
    },
  },
  {
    id: "content-length", label: "Content length (300+ words)", severity: "important",
    run({ content }) {
      if (!content) return { status: "skip", message: "No content to analyze." };
      const wc = content.trim().split(/\s+/).filter(Boolean).length;
      if (wc >= 600) return { status: "pass", message: `${wc} words — excellent. ✓` };
      if (wc >= 300) return { status: "pass", message: `${wc} words — meets minimum. Aim for 600+.` };
      return { status: "fail", message: `Only ${wc} words. Add more content (aim 300+).` };
    },
  },
  {
    id: "keyword-in-first-para", label: "Keyword in first paragraph", severity: "important",
    run({ content, seo }) {
      if (!seo.focusKeyword || !content) return { status: "skip" };
      const firstPara = content.split("\n").find(p => p.trim().length > 50) || "";
      const found = firstPara.toLowerCase().includes(seo.focusKeyword.toLowerCase());
      return { status: found ? "pass" : "fail", message: found ? "Keyword in opening paragraph. ✓" : "Mention focus keyword in the first paragraph." };
    },
  },
  {
    id: "has-content", label: "Page has content", severity: "important",
    run({ content }) {
      const ok = Boolean(content?.trim());
      return { status: ok ? "pass" : "fail", message: ok ? "Page has content. ✓" : "Add content to this page." };
    },
  },

  // ── Recommended ───────────────────────────────────────────────
  {
    id: "keyword-density", label: "Keyword density (0.5–2.5%)", severity: "recommended",
    run({ content, seo }) {
      if (!seo.focusKeyword || !content) return { status: "skip" };
      const words = content.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return { status: "skip" };
      const kw    = seo.focusKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const count = (content.toLowerCase().match(new RegExp(kw, "g")) || []).length;
      const density = (count / words.length) * 100;
      if (density >= 0.5 && density <= 2.5) return { status: "pass", message: `Density ${density.toFixed(1)}% — ideal. ✓` };
      if (density < 0.5) return { status: "fail", message: `Density too low (${density.toFixed(1)}%). Use keyword more naturally.` };
      return { status: "fail", message: `Density too high (${density.toFixed(1)}%). Reduce keyword stuffing.` };
    },
  },
  {
    id: "schema-set", label: "Schema markup selected", severity: "recommended",
    run({ seo }) {
      const ok = seo.schemaType && seo.schemaType !== "none";
      return { status: ok ? "pass" : "fail", message: ok ? `Schema type "${seo.schemaType}" set. ✓` : "Select a schema type in the Schema tab." };
    },
  },
];

export function runAllChecks({ content, seo }) {
  return CHECKS.map(check => {
    try {
      const result = check.run({ content, seo });
      return { id: check.id, label: check.label, severity: check.severity, ...result };
    } catch {
      return { id: check.id, label: check.label, severity: check.severity, status: "skip", message: "Check failed." };
    }
  });
}

export function calculateScore(checks) {
  let passed = 0, total = 0;
  checks.forEach(r => {
    if (r.status === "skip") return;
    const w = SEVERITY_WEIGHT[r.severity] || 1;
    total  += w;
    if (r.status === "pass") passed += w;
  });
  return total === 0 ? 0 : Math.round((passed / total) * 100);
}