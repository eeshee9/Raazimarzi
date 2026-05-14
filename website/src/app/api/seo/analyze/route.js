// app/api/seo/analyze/route.js
// POST — runs all 12 SEO checks and returns score + results
import { NextResponse } from 'next/server';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';
import { extractContent } from '@/libraries/htmlParser';
import { runAllChecks, calculateScore } from '@/libraries/seoChecks';

export async function POST(request) {
  try {
    const { seo, pageId } = await request.json();

    if (!seo) {
      return NextResponse.json({ score: 0, checks: [] }, { status: 400 });
    }

    // Fetch page content to analyze
    let content = { h1: '', paragraphs: [], images: [], internalLinks: [], wordCount: 0 };
    if (pageId) {
      await connectDB();
      const page = await Page.findById(pageId).select('content').lean();
      if (page?.content) {
        content = extractContent(page.content);
      }
    }

    const context = {
      slug:    seo.slug || '',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://raazimarzi.com',
    };

    const checks = runAllChecks({ content, seo, context });
    const score  = calculateScore(checks);

    // Persist score back to DB (fire-and-forget)
    if (pageId) {
      connectDB().then(() => {
        Page.findByIdAndUpdate(pageId, {
          $set: {
            'seo.score':          score,
            'seo.checks':         checks,
            'seo.lastAnalyzedAt': new Date(),
          }
        }).exec().catch(console.error);
      });
    }

    return NextResponse.json({ score, checks });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ score: 0, checks: [] }, { status: 500 });
  }
}