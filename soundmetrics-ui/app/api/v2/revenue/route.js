import { NextResponse } from 'next/server';

export async function GET(request) {
  const clientSecret = request.headers.get('x-internal-secret') || '';

  try {
    const res = await fetch('http://api:8000/api/v2/revenue', {
      headers: { 'x-internal-secret': clientSecret },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error }, { status: res.status });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Upstream unreachable' }, { status: 502 });
  }
}