// website/src/app/robots.js
// Auto-generates robots.txt for raazimarzi.com
// Visit: https://raazimarzi.com/robots.txt

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://raazimarzi.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/cms/',       // block CMS from indexing
          '/api/',       // block API routes
          '/_next/',     // block Next.js internals
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}