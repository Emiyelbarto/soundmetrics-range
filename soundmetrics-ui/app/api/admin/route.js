import { NextResponse } from 'next/server';

export async function GET(request) {
  const secret = request.headers.get('x-internal-secret');
  try {
    const res = await fetch('http://api:8000/api/internal/revenue', { headers: { 'x-internal-secret': secret || '' }, cache: 'no-store' });
    if (res.ok) return NextResponse.json({ data: await res.json() }, { status: 200 });
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  } catch (e) { return NextResponse.json({ error: "Network Error" }, { status: 500 }); }
}

export async function POST(request) {
  const secret = request.headers.get('x-internal-secret');
  try {
    const res = await fetch('http://api:8000/api/internal/upload', { 
      method: 'POST', 
      headers: { 'x-internal-secret': secret || '' } 
    });
    if (res.ok) return NextResponse.json({ data: await res.json() }, { status: 200 });
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  } catch (e) { return NextResponse.json({ error: "Network Error" }, { status: 500 }); }
}
