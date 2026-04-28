import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch('http://api:8000/api/v2/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok) {
      const token = await new SignJWT({ username: body.username, isadmin: data.isadmin === true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(JWT_SECRET);

      const response = NextResponse.json(data, { status: 200 });
      response.cookies.set('sm_session', token, {
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        maxAge: 86400,
      });
      return response;
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Network Error" }, { status: 500 });
  }
}