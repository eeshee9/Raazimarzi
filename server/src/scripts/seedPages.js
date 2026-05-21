// server/src/scripts/seedPages.js
// Run ONCE to create all RaaziMarzi website pages in MongoDB
// Command: node src/scripts/seedPages.js

import "dotenv/config";
import mongoose from "mongoose";
import SeoPage  from "../models/seoPageModel.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const PAGES = [
  // ── Core pages ──────────────────────────────────────────────
  {
    title:    "Homepage",
    slug:     "home",
    category: "other",
    pageType: "static",
    status:   "published",
    excerpt:  "RaaziMarzi — India's online dispute resolution platform",
  },
  {
    title:    "About Us",
    slug:     "about-us",
    category: "about",
    pageType: "static",
    status:   "published",
    excerpt:  "Learn about RaaziMarzi's mission and team",
  },
  {
    title:    "Contact Us",
    slug:     "contact-us",
    category: "other",
    pageType: "static",
    status:   "published",
    excerpt:  "Get in touch with RaaziMarzi",
  },
  {
    title:    "Services",
    slug:     "services",
    category: "services",
    pageType: "service",
    status:   "published",
    excerpt:  "All dispute resolution services offered by RaaziMarzi",
  },

  // ── Individual disputes ──────────────────────────────────────
  {
    title:    "Individual Disputes",
    slug:     "services/individual-disputes",
    category: "individual-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve individual disputes online through expert mediation",
  },
  {
    title:    "Family Disputes",
    slug:     "services/family-disputes",
    category: "family-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve family disputes sensitively through online mediation",
  },
  {
    title:    "Property & Rental Disputes",
    slug:     "services/property-rental-disputes",
    category: "property-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve property and rental disputes online",
  },
  {
    title:    "Neighbour Disputes",
    slug:     "services/neighbour-disputes",
    category: "neighbour-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve neighbour and community disputes peacefully",
  },

  // ── Consumer disputes ────────────────────────────────────────
  {
    title:    "Consumer Disputes",
    slug:     "services/consumer-disputes",
    category: "consumer-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve consumer complaints and disputes online",
  },

  // ── Commercial disputes ──────────────────────────────────────
  {
    title:    "Commercial Disputes",
    slug:     "services/commercial-disputes",
    category: "commercial-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve commercial and business disputes online",
  },
  {
    title:    "Contract Disputes",
    slug:     "services/contract-disputes",
    category: "contract-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve contract disputes through expert mediation",
  },
  {
    title:    "Partnership Disputes",
    slug:     "services/partnership-disputes",
    category: "partnership-disputes",
    pageType: "dispute",
    status:   "published",
    excerpt:  "Resolve business partnership disputes online",
  },
];

let created = 0;
let skipped = 0;

for (const page of PAGES) {
  const exists = await SeoPage.findOne({ slug: page.slug });
  if (exists) {
    console.log(`⏭  Skipped (already exists): ${page.slug}`);
    skipped++;
  } else {
    await SeoPage.create(page);
    console.log(`✓  Created: ${page.slug}`);
    created++;
  }
}

console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
console.log(`\nNow go to localhost:3000/cms/pages to see all pages.`);
console.log(`Click any page → SEO settings → fill in title, description, keyword → Save.`);
console.log(`The live website will update automatically.\n`);
process.exit(0);