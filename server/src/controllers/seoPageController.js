// server/src/controllers/seoPage.controller.js
import SeoPage from "../models/seoPageModel.js";
import { runAllChecks, calculateScore } from "../services/seoAnalyzer.service.js";

// GET /api/cms/pages
export const getAll = async (req, res) => {
  try {
    const { status, category, pageType, search, sort = "updatedAt", order = "desc", limit = 50 } = req.query;
    const query = {};
    if (status)   query.status   = status;
    if (category) query.category = category;
    if (pageType) query.pageType = pageType;
    if (search)   query.title    = { $regex: search, $options: "i" };

    const sortObj = { [sort === "score" ? "seo.score" : sort]: order === "asc" ? 1 : -1 };

    const pages = await SeoPage.find(query)
      .select("title slug status category pageType seo.score seo.title seo.description seo.focusKeyword updatedAt")
      .sort(sortObj)
      .limit(Number(limit))
      .lean();

    const total = await SeoPage.countDocuments(query);
    res.json({ pages, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cms/pages/:id
export const getOne = async (req, res) => {
  try {
    const page = await SeoPage.findById(req.params.id).lean();
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cms/pages/slug/:slug — public, called by website/
export const getBySlug = async (req, res) => {
  try {
    const page = await SeoPage.findOne({ slug: req.params.slug, status: "published" })
      .select("title slug seo")
      .lean();
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/cms/pages
export const create = async (req, res) => {
  try {
    const { title, slug, category, excerpt, content, status, pageType, tags } = req.body;

    const exists = await SeoPage.findOne({ slug });
    if (exists) return res.status(400).json({ message: "A page with this slug already exists" });

    const page = await SeoPage.create({ title, slug, category, excerpt, content, status, pageType, tags });
    res.status(201).json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cms/pages/:id
export const update = async (req, res) => {
  try {
    const { title, slug, category, excerpt, content, status, pageType, tags } = req.body;
    const page = await SeoPage.findByIdAndUpdate(
      req.params.id,
      { $set: { title, slug, category, excerpt, content, status, pageType, tags } },
      { new: true }
    );
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/cms/pages/:id/seo
export const updateSeo = async (req, res) => {
  try {
    const { seo } = req.body;
    const page = await SeoPage.findByIdAndUpdate(
      req.params.id,
      { $set: { seo } },
      { new: true }
    ).select("title slug seo");
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json({ success: true, seo: page.seo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/cms/pages/:id/analyze
export const analyze = async (req, res) => {
  try {
    const { seo } = req.body;
    const page    = await SeoPage.findById(req.params.id).select("content").lean();
    const content = page?.content || "";

    const checks = runAllChecks({ content, seo });
    const score  = calculateScore(checks);

    SeoPage.findByIdAndUpdate(req.params.id, {
      $set: { "seo.score": score, "seo.checks": checks, "seo.lastAnalyzedAt": new Date() }
    }).exec().catch(console.error);

    res.json({ score, checks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/cms/pages/:id
export const remove = async (req, res) => {
  try {
    await SeoPage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cms/dashboard
export const dashboard = async (req, res) => {
  try {
    const [overview, worstPages] = await Promise.all([
      SeoPage.aggregate([
        { $match: { status: "published" } },
        { $group: {
          _id:       null,
          total:     { $sum: 1 },
          avgScore:  { $avg: "$seo.score" },
          excellent: { $sum: { $cond: [{ $gte: ["$seo.score", 80] }, 1, 0] } },
          good:      { $sum: { $cond: [{ $and: [{ $gte: ["$seo.score", 50] }, { $lt: ["$seo.score", 80] }] }, 1, 0] } },
          needsWork: { $sum: { $cond: [{ $lt:  ["$seo.score", 50] }, 1, 0] } },
          noTitle:   { $sum: { $cond: [{ $not: ["$seo.title"] }, 1, 0] } },
          noDesc:    { $sum: { $cond: [{ $not: ["$seo.description"] }, 1, 0] } },
          noKeyword: { $sum: { $cond: [{ $not: ["$seo.focusKeyword"] }, 1, 0] } },
        }}
      ]),
      SeoPage.find({ status: "published" })
        .select("title slug seo.score seo.title updatedAt")
        .sort({ "seo.score": 1 })
        .limit(10)
        .lean(),
    ]);
    res.json({ overview: overview[0] || {}, worstPages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/cms/sitemap
export const sitemap = async (req, res) => {
  try {
    const pages = await SeoPage.find({ status: "published" })
      .select("slug updatedAt")
      .lean();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};