import { NextResponse } from 'next/server';

export async function POST(request) {
  return NextResponse.json({ 
    error: "Endpoint deprecated in v2.4", 
    hint: "Auth migrated to BFF architecture. See internal wiki.",
    fallback_token: "SU5URVJOQUxfREVQUkVDQVRFRF9QQVNTV09SRAo="
  }, { status: 401 });
}

export async function GET(request) {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
