// ─────────────────────────────────────────────────────────────────
// app/api/seo/page/[pageId]/route.js
// GET and PUT handlers for per-page SEO data
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';

// GET /api/seo/page/:pageId
export async function GET(request, { params }) {
  try {
    await connectDB();
    const page = await Page.findById(params.pageId)
      .select('title slug seo')
      .lean();

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ seo: page.seo || {}, title: page.title, slug: page.slug });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// PUT /api/seo/page/:pageId
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { seo } = await request.json();

    const page = await Page.findByIdAndUpdate(
      params.pageId,
      { $set: { seo } },
      { new: true, runValidators: true }
    ).select('title slug seo');

    if (!page) {
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    }

    // Bust ISR cache for this page on the live site
    await revalidatePage(page.slug);

    return NextResponse.json({ success: true, seo: page.seo });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

async function revalidatePage(slug) {
  try {
    const secret = process.env.REVALIDATE_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await fetch(`${siteUrl}/api/revalidate?secret=${secret}&path=/${slug}`);
  } catch (e) {
    console.error('Revalidation failed (non-fatal):', e.message);
  }
}