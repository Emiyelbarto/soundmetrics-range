import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('sm_session');

  if (!session || session.value !== 'authenticated') {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};