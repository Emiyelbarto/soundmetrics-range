import { NextResponse } from 'next/server';

export async function POST(request) {
  return NextResponse.json({ 
    error: "Endpoint deprecated in v2.4", 
    hint: "Auth migrated to BFF architecture. See internal wiki.",
    fallback_token: "SU5URVJOQUxfREVQUkVDQVRFRF9QQVNTV09SRAo="
  }, { status: 401 });
}

export async function GET(request) {
  const legacyHeader = request.headers.get('x-legacy-client');
  if (legacyHeader !== 'migration-tool-v1') {
    return NextResponse.json({ error: "Forbidden", hint: "Legacy client header required." }, { status: 403 });
  }
  try {
    const res = await fetch('http://api:8000/api/v1/users', { cache: 'no-store' });
    if (res.ok) return NextResponse.json({ data: await res.json() }, { status: 200 });
  } catch (e) { return NextResponse.json({ error: "Network Error" }, { status: 500 }); }
}