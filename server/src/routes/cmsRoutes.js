// server/src/routes/cms.routes.js
import { Router } from "express";
import * as cmsAuth  from "../controllers/cmsAuthController.js";
import * as seoPage  from "../controllers/seoPageController.js";
import * as redirect  from "../controllers/redirectController.js";
import { cmsAuthMiddleware, cmsManagerOnly } from "../middleware/cmsMiddleware.js";

const router = Router();

// ── Auth (public) ─────────────────────────────────────────────
router.post("/auth/login",  cmsAuth.login);
router.post("/auth/logout", cmsAuth.logout);
router.get ("/auth/me",     cmsAuthMiddleware, cmsAuth.me);

// ── Dashboard ─────────────────────────────────────────────────
router.get("/dashboard", cmsAuthMiddleware, seoPage.dashboard);

// ── Pages CRUD ────────────────────────────────────────────────
router.get   ("/pages",             cmsAuthMiddleware, seoPage.getAll);
router.post  ("/pages",             cmsAuthMiddleware, seoPage.create);
router.get   ("/pages/slug/:slug",  seoPage.getBySlug);   // public — called by website/
router.get   ("/pages/:id",         cmsAuthMiddleware, seoPage.getOne);
router.put   ("/pages/:id",         cmsAuthMiddleware, seoPage.update);
router.put   ("/pages/:id/seo",     cmsAuthMiddleware, seoPage.updateSeo);
router.post  ("/pages/:id/analyze", cmsAuthMiddleware, seoPage.analyze);
router.delete("/pages/:id",         cmsAuthMiddleware, cmsManagerOnly, seoPage.remove);


// ── Redirects ─────────────────────────────────────────────────
router.get   ("/redirects",       cmsAuthMiddleware, redirect.getAll);
router.post  ("/redirects",       cmsAuthMiddleware, redirect.create);
router.put   ("/redirects/:id",   cmsAuthMiddleware, redirect.update);
router.delete("/redirects/:id",   cmsAuthMiddleware, cmsManagerOnly, redirect.remove);
router.get   ("/redirects/check", redirect.check);   


// ── Sitemap data (public — used by website/) ──────────────────
router.get("/sitemap", seoPage.sitemap);

export default router;