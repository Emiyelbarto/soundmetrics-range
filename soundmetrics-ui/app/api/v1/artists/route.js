import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  
  try {
    const res = await fetch(`http://api:8000/api/v1/artists?q=${q}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({ error: "Backend Error" }, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Network Error" }, { status: 500 });
  }
}
