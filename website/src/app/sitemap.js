// website/src/app/sitemap.js
// Auto-generates sitemap.xml for the live raazimarzi.com site
// Reads published pages from Express server
// Visit: https://raazimarzi.com/sitemap.xml

const API      = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL   || 'https://raazimarzi.com';

export default async function sitemap() {
  // Static pages — always included
  const staticPages = [
    { url: SITE_URL,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/AboutUs`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/ContactUs`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/terms`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/Services`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/Services/IndividualDisputes`,   lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/ConsumerDisputes`,     lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/CommercialDisputes`,   lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/FamilyDisputes`,             lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/NeighborDisputes`,           lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/Property%26RentalDisputes`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/Services/ContractDisputes`,           lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
  ];

  // Dynamic pages from CMS
  let dynamicPages = [];
  try {
    const res  = await fetch(`${API}/api/cms/sitemap`, { next: { revalidate: 3600 } }); // cache 1 hour
    const data = await res.json();

    if (Array.isArray(data)) {
      dynamicPages = data.map(page => ({
        url:             `${SITE_URL}/${page.slug}`,
        lastModified:    page.updatedAt ? new Date(page.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority:        0.8,
      }));
    }
  } catch {
    // If server is down, sitemap still works with static pages
    console.error('Sitemap: Could not fetch dynamic pages from CMS');
  }

  return [...staticPages, ...dynamicPages];
}