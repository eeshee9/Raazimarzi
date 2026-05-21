// website/src/lib/getPageSeo.js
// Shared helper — call this from any page's generateMetadata()
// Fetches SEO data from Express server by slug

const API      = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL   || 'https://raazimarzi.com';

/**
 * Fetch SEO data for a page by its slug
 * @param {string} slug - the page slug set in CMS e.g. "services/commercial-disputes"
 * @param {object} fallback - default metadata if CMS has no data yet
 */
export async function getPageSeo(slug, fallback = {}) {
  try {
    const res = await fetch(`${API}/api/cms/pages/slug/${slug}`, {
      next: { revalidate: 3600 }, // cache for 1 hour, revalidate in background
    });

    if (!res.ok) return buildFallback(slug, fallback);

    const data = await res.json();
    const seo  = data?.seo || {};

    return {
      title:       seo.title       || fallback.title       || 'RaaziMarzi',
      description: seo.description || fallback.description || '',
      keywords:    seo.focusKeyword
        ? [seo.focusKeyword, ...(seo.secondaryKeywords || [])]
        : fallback.keywords || [],
      alternates: {
        canonical: seo.canonical || `${SITE_URL}/${slug}`,
      },
      robots: {
        index:  seo.robots?.index  ?? true,
        follow: seo.robots?.follow ?? true,
      },
      openGraph: {
        title:       seo.og?.title       || seo.title       || fallback.title || 'RaaziMarzi',
        description: seo.og?.description || seo.description || fallback.description || '',
        url:         `${SITE_URL}/${slug}`,
        siteName:    'RaaziMarzi',
        images:      seo.og?.image
          ? [{ url: seo.og.image, width: 1200, height: 630 }]
          : fallback.ogImage
          ? [{ url: fallback.ogImage, width: 1200, height: 630 }]
          : [],
        type: 'website',
      },
      twitter: {
        card:        seo.twitter?.card        || 'summary_large_image',
        title:       seo.twitter?.title       || seo.title       || fallback.title || 'RaaziMarzi',
        description: seo.twitter?.description || seo.description || fallback.description || '',
        images:      seo.twitter?.image || seo.og?.image
          ? [seo.twitter?.image || seo.og?.image]
          : [],
      },
      // JSON-LD schema — returned separately so page can inject it
      schemaType: seo.schemaType || 'none',
      schemaData: seo.schemaData || {},
    };
  } catch {
    // If server is down, use fallback — never crash the page
    return buildFallback(slug, fallback);
  }
}

function buildFallback(slug, fallback) {
  return {
    title:       fallback.title       || 'RaaziMarzi',
    description: fallback.description || '',
    keywords:    fallback.keywords    || [],
    alternates:  { canonical: `${SITE_URL}/${slug}` },
    robots:      { index: true, follow: true },
    openGraph: {
      title:       fallback.title || 'RaaziMarzi',
      description: fallback.description || '',
      url:         `${SITE_URL}/${slug}`,
      siteName:    'RaaziMarzi',
      images:      fallback.ogImage ? [{ url: fallback.ogImage }] : [],
      type:        'website',
    },
    twitter: {
      card:  'summary_large_image',
      title: fallback.title || 'RaaziMarzi',
    },
  };
}