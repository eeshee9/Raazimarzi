// // libraries/htmlParser.js
// // Extracts SEO-relevant content from your rich text editor JSON (TipTap format)
// // Returns: { h1, paragraphs[], images[], internalLinks[], wordCount }

// const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://raazimarzi.com';

// /**
//  * Main export — call this with your page.content field from MongoDB
//  * Works with TipTap JSON. If you use Lexical, see the note at the bottom.
//  */
// export function extractContent(editorJson) {
//   const result = {
//     h1: '',
//     paragraphs: [],
//     images: [],
//     internalLinks: [],
//     wordCount: 0,
//   };

//   if (!editorJson) return result;

//   // TipTap stores { type: 'doc', content: [...nodes] }
//   // If your content is a plain string (HTML), use extractFromHtml() instead
//   if (typeof editorJson === 'string') {
//     return extractFromHtml(editorJson);
//   }

//   const nodes = Array.isArray(editorJson)
//     ? editorJson
//     : (editorJson.content || []);

//   walkNodes(nodes, result);

//   const allText    = result.paragraphs.join(' ');
//   result.wordCount = allText.trim().split(/\s+/).filter(Boolean).length;

//   return result;
// }

// function walkNodes(nodes, result) {
//   if (!Array.isArray(nodes)) return;

//   for (const node of nodes) {
//     if (!node) continue;

//     // H1 heading
//     if (node.type === 'heading' && node.attrs?.level === 1) {
//       result.h1 = extractText(node);
//     }

//     // Paragraphs
//     if (node.type === 'paragraph') {
//       const text = extractText(node).trim();
//       if (text) result.paragraphs.push(text);
//     }

//     // Images
//     if (node.type === 'image') {
//       result.images.push({
//         src: node.attrs?.src || '',
//         alt: node.attrs?.alt || '',
//       });
//     }

//     // Links (inside text marks)
//     if (node.type === 'text' && node.marks) {
//       for (const mark of node.marks) {
//         if (mark.type === 'link' && mark.attrs?.href) {
//           const href = mark.attrs.href;
//           if (href.startsWith('/') || href.includes(SITE_URL)) {
//             result.internalLinks.push(href);
//           }
//         }
//       }
//     }

//     // Recurse into children
//     if (node.content?.length) {
//       walkNodes(node.content, result);
//     }
//   }
// }

// function extractText(node) {
//   if (node.type === 'text') return node.text || '';
//   if (!node.content) return '';
//   return node.content.map(extractText).join('');
// }

// // ─── Fallback for plain HTML strings ─────────────────────────────
// // If your content field is HTML instead of TipTap JSON, use this
// function extractFromHtml(html) {
//   const result = {
//     h1: '',
//     paragraphs: [],
//     images: [],
//     internalLinks: [],
//     wordCount: 0,
//   };

//   if (typeof window === 'undefined') {
//     // Server-side: basic regex extraction (no DOM available)
//     const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
//     if (h1Match) result.h1 = h1Match[1].replace(/<[^>]+>/g, '');

//     const paraMatches = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)];
//     result.paragraphs = paraMatches
//       .map(m => m[1].replace(/<[^>]+>/g, '').trim())
//       .filter(Boolean);

//     const imgMatches = [...html.matchAll(/<img[^>]+>/gi)];
//     result.images = imgMatches.map(m => {
//       const src = (m[0].match(/src="([^"]*)"/) || [])[1] || '';
//       const alt = (m[0].match(/alt="([^"]*)"/) || [])[1] || '';
//       return { src, alt };
//     });

//     const linkMatches = [...html.matchAll(/href="([^"]+)"/gi)];
//     result.internalLinks = linkMatches
//       .map(m => m[1])
//       .filter(href => href.startsWith('/') || href.includes(SITE_URL));

//     const allText    = result.paragraphs.join(' ');
//     result.wordCount = allText.trim().split(/\s+/).filter(Boolean).length;
//     return result;
//   }

//   // Client-side: use DOM parser
//   const parser = new DOMParser();
//   const doc    = parser.parseFromString(html, 'text/html');

//   const h1 = doc.querySelector('h1');
//   if (h1) result.h1 = h1.textContent || '';

//   doc.querySelectorAll('p').forEach(p => {
//     const text = p.textContent?.trim();
//     if (text) result.paragraphs.push(text);
//   });

//   doc.querySelectorAll('img').forEach(img => {
//     result.images.push({ src: img.src || '', alt: img.alt || '' });
//   });

//   doc.querySelectorAll('a[href]').forEach(a => {
//     const href = a.getAttribute('href') || '';
//     if (href.startsWith('/') || href.includes(SITE_URL)) {
//       result.internalLinks.push(href);
//     }
//   });

//   const allText    = result.paragraphs.join(' ');
//   result.wordCount = allText.trim().split(/\s+/).filter(Boolean).length;
//   return result;
// }

// // ─── NOTE for Lexical editor users ───────────────────────────────
// // Lexical stores content differently. Replace walkNodes with:
// //
// // function walkLexical(nodes, result) {
// //   for (const node of nodes) {
// //     if (node.type === 'heading' && node.tag === 'h1') {
// //       result.h1 = node.children?.map(c => c.text || '').join('') || '';
// //     }
// //     if (node.type === 'paragraph') {
// //       const text = node.children?.map(c => c.text || '').join('').trim();
// //       if (text) result.paragraphs.push(text);
// //     }
// //     if (node.type === 'image') {
// //       result.images.push({ src: node.src || '', alt: node.altText || '' });
// //     }
// //     if (node.children) walkLexical(node.children, result);
// //   }
// // }