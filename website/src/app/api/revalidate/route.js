// app/api/revalidate/route.js
// Called by the CMS after saving SEO to bust ISR cache instantly
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const path   = searchParams.get('path');

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ message: 'Missing path' }, { status: 400 });
  }

  revalidatePath(path);
  console.log(`[ISR] Revalidated: ${path}`);
  return NextResponse.json({ revalidated: true, path });
}