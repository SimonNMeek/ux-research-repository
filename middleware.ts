import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect workspace routes, workspaces page, and organization management
  if (pathname.startsWith('/w/') || pathname === '/workspaces' || pathname.startsWith('/org/')) {
    const session = request.cookies.get('session_id')?.value;
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/w/:path*', '/workspaces', '/org/:path*'],
};


