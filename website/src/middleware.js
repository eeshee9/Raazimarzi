// // website/src/middleware.js
// // Protects all /cms/* routes — redirects to /cms/login if no session

// import { NextResponse } from 'next/server';

// export function middleware(request) {
//   const { pathname } = request.nextUrl;

//   // Only protect /cms routes (not /cms/login itself)
//   if (pathname.startsWith('/cms') && !pathname.startsWith('/cms/login')) {
//     const token = request.cookies.get('cms_token')?.value;

//     if (!token) {
//       const loginUrl = new URL('/cms/login', request.url);
//       loginUrl.searchParams.set('from', pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/cms/:path*'],
// };