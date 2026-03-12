import { NextResponse } from 'next/server';

export async function GET(request) {
  const clientSecret = request.headers.get('x-internal-secret') || '';

  const authCheck = await fetch('http://api:8000/api/v2/pipeline', {
    headers: { 'x-internal-secret': clientSecret },
    cache: 'no-store',
  }).catch(() => null);

  if (!authCheck || !authCheck.ok) {
    return NextResponse.json(
      { error: 'Access Denied: Invalid Gateway Secret' },
      { status: 403 }
    );
  }

  const data = await authCheck.json();
  return NextResponse.json(data);
}