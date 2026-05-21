// server/src/models/seoPage.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const seoSchema = new Schema({
  title:       { type: String, maxlength: 70,  trim: true },
  description: { type: String, maxlength: 180, trim: true },
  canonical:   { type: String, trim: true },
  robots: {
    index:  { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
  },
  og: {
    title:       String,
    description: String,
    image:       String,
  },
  twitter: {
    card:        { type: String, enum: ["summary", "summary_large_image"], default: "summary_large_image" },
    title:       String,
    description: String,
    image:       String,
  },
  focusKeyword:      { type: String, trim: true },
  secondaryKeywords: [String],
  schemaType: {
    type: String,
    enum: ["none","Article","FAQPage","LegalService","HowTo","Organization","LocalBusiness"],
    default: "none",
  },
  schemaData:     { type: Schema.Types.Mixed, default: {} },
  score:          { type: Number, default: 0, min: 0, max: 100 },
  lastAnalyzedAt: Date,
  checks: [{
    id: String, label: String, severity: String,
    status:  { type: String, enum: ["pass","fail","warning","skip"] },
    message: String,
    _id: false,
  }],
  customMetaTags: [{ name: String, content: String, _id: false }],
}, { _id: false });

const seoPageSchema = new Schema({
  title:    { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: {
    type: String,
    enum: [
      "individual-disputes","consumer-disputes","commercial-disputes",
      "family-disputes","property-disputes","neighbour-disputes",
      "contract-disputes","partnership-disputes",
      "services","about","blog","other",
    ],
  },
  excerpt:  { type: String, maxlength: 300 },
  content:  { type: String },
  status:   { type: String, enum: ["draft","published"], default: "draft" },
  pageType: { type: String, enum: ["dispute","blog","service","static"], default: "dispute" },
  author:   { type: String, default: "RaaziMarzi Team" },
  tags:     [String],
  seo:      seoSchema,
}, { timestamps: true });

seoPageSchema.index({ slug: 1 });
seoPageSchema.index({ status: 1 });
seoPageSchema.index({ category: 1, status: 1 });
seoPageSchema.index({ "seo.score": 1 });
seoPageSchema.index({ pageType: 1, status: 1 });

export default mongoose.model("SeoPage", seoPageSchema);