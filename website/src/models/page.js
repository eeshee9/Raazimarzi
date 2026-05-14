// models/Page.js
// Your main content model — add the seo subdocument to whatever
// page/dispute model you already have in your project.
//
// If you already have a Page model, ONLY add the seoSchema 
// subdocument + indexes shown below. Don't replace your existing model.

import mongoose from 'mongoose';

const { Schema } = mongoose;

// ─── SEO subdocument ──────────────────────────────────────────────
// Embed this into ANY content collection (disputes, blog posts, etc.)
const seoSchema = new Schema({
  // Basic
  title:       { type: String, maxlength: 70, trim: true },
  description: { type: String, maxlength: 180, trim: true },
  slug:        { type: String, trim: true, lowercase: true },
  canonical:   { type: String, trim: true },
  robots: {
    index:  { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
  },

  // Social / OG
  og: {
    title:       { type: String, trim: true },
    description: { type: String, trim: true },
    image:       { type: String, trim: true },
  },
  twitter: {
    card:        { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image' },
    title:       { type: String, trim: true },
    description: { type: String, trim: true },
    image:       { type: String, trim: true },
  },

  // Keywords
  focusKeyword:      { type: String, trim: true },
  secondaryKeywords: [{ type: String, trim: true }],

  // Schema markup
  schemaType: {
    type: String,
    enum: ['none', 'Article', 'FAQPage', 'LegalService', 'HowTo', 'Organization', 'LocalBusiness'],
    default: 'none',
  },
  schemaData: { type: Schema.Types.Mixed, default: {} },

  // Analysis cache (written by analyzer, read by dashboard)
  score:          { type: Number, default: 0, min: 0, max: 100 },
  lastAnalyzedAt: { type: Date },
  checks: [{
    id:       String,
    label:    String,
    severity: String,
    status:   { type: String, enum: ['pass', 'fail', 'warning', 'skip'] },
    message:  String,
    _id: false,
  }],

  // Advanced
  customMetaTags: [{
    name:    String,
    content: String,
    _id: false,
  }],
}, { _id: false });

// ─── Page schema ──────────────────────────────────────────────────
// Adjust fields below to match your EXISTING page/dispute schema.
// The important part is adding `seo: seoSchema` to it.

const pageSchema = new Schema({
  title:    { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  content:  { type: Schema.Types.Mixed },       // your TipTap / Lexical JSON
  category: { type: String, trim: true },        // e.g. 'individual', 'consumer', 'commercial'
  status:   { type: String, enum: ['draft', 'published'], default: 'draft' },
  excerpt:  { type: String, maxlength: 300 },

  // ← THIS IS THE KEY ADDITION — add seo to your existing schema
  seo: seoSchema,

}, { timestamps: true });

// ─── Indexes — CRITICAL for performance ──────────────────────────
pageSchema.index({ slug: 1 });                          // fast slug lookups for generateMetadata()
pageSchema.index({ status: 1 });                        // filter published pages
pageSchema.index({ status: 1, 'seo.score': 1 });        // dashboard sorting
pageSchema.index({ category: 1, status: 1 });           // category pages

// ─── Export ───────────────────────────────────────────────────────
const Page = mongoose.models.Page || mongoose.model('Page', pageSchema);
export default Page;


// ─────────────────────────────────────────────────────────────────
// HOW TO ADD SEO TO YOUR EXISTING MODELS
// (if you have FamilyDisputes, PropertyDisputes etc as separate models)
// ─────────────────────────────────────────────────────────────────
//
// Option A: Add seoSchema to each existing model:
//   existingSchema.add({ seo: seoSchema });
//   existingSchema.index({ slug: 1 });
//
// Option B: Use this single Page model for all dispute types
//   and use the `category` field to differentiate:
//   { category: 'family-disputes', slug: 'divorce-mediation', ... }
//
// The drawer works with any model — just make sure the API route
// at app/api/seo/page/[pageId]/route.js uses the right model.