// website/src/app/cms/pages/[pageId]/page.js
// Full page editor — content editing + SEO drawer
// This is where USAGE.js logic actually lives

import { notFound } from 'next/navigation';
import { connectDB } from '@/libraries/db';
import Page from '@/models/page';
import PageEditorClient from '@/components/cms/PageEditorClient';

async function getPage(pageId) {
  await connectDB();
  if (pageId === 'new') return null;
  const page = await Page.findById(pageId).lean();
  if (!page) notFound();
  return page;
}

export default async function PageEditor({ params }) {
  const page = await getPage(params.pageId);
  const isNew = params.pageId === 'new';

  return (
    <PageEditorClient
      pageId={isNew ? null : params.pageId}
      initialData={page}
      isNew={isNew}
    />
  );
}