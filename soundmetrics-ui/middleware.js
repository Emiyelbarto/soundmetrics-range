import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request) {
  const session = request.cookies.get('sm_session');

  if (!session) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(session.value, JWT_SECRET));
  } catch {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  if (isAdminRoute && !payload.isadmin) {
    return NextResponse.redirect(new URL('/player', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/player/:path*'],
};