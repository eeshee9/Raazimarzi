// website/src/app/api/cms/pages/route.js
// GET all pages + POST new page

import { NextResponse } from 'next/server';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';

// GET /api/cms/pages
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status   = searchParams.get('status');
    const category = searchParams.get('category');
    const search   = searchParams.get('search');

    const query = {};
    if (status)   query.status   = status;
    if (category) query.category = category;
    if (search)   query.title    = { $regex: search, $options: 'i' };

    const pages = await Page.find(query)
      .select('title slug status category seo.score seo.title seo.focusKeyword updatedAt')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ pages, total: pages.length });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

// POST /api/cms/pages — create new page
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // Check slug uniqueness
    const exists = await Page.findOne({ slug: body.slug });
    if (exists) {
      return NextResponse.json({ message: 'A page with this slug already exists' }, { status: 400 });
    }

    const page = await Page.create({
      title:    body.title,
      slug:     body.slug,
      category: body.category,
      excerpt:  body.excerpt,
      content:  body.content,
      status:   body.status || 'draft',
    });

    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}


// website/src/app/api/cms/pages/[pageId]/route.js
// GET single + PUT update + DELETE

// NOTE: Create this file at: src/app/api/cms/pages/[pageId]/route.js
// Content below:

/*
import { NextResponse } from 'next/server';
import { connectDB } from '@/libraries/db';
import Page from '@/models/Page';
import { revalidatePath } from 'next/cache';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const page = await Page.findById(params.pageId).lean();
    if (!page) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(page);
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const body = await request.json();

    const page = await Page.findByIdAndUpdate(
      params.pageId,
      { $set: {
        title:    body.title,
        slug:     body.slug,
        category: body.category,
        excerpt:  body.excerpt,
        content:  body.content,
        status:   body.status,
      }},
      { new: true }
    );

    if (!page) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    // Revalidate live page
    revalidatePath('/' + page.slug);

    return NextResponse.json(page);
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    await Page.findByIdAndDelete(params.pageId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
*/