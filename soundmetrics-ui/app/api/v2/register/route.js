import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const res = await fetch('http://api:8000/api/v2/register', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) { 
    return NextResponse.json({ error: "Network Error" }, { status: 500 }); 
  }
}