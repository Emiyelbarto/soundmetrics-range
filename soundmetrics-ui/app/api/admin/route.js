import { NextResponse } from 'next/server';

export async function GET(request) {
  // Extraemos el secreto que el cliente nos mandó
  const secretHeader = request.headers.get('x-internal-secret');
  
  try {
    // Hacemos proxy de la petición hacia La Bóveda interna usando la red de Docker
    const backendRes = await fetch('http://api:8000/api/internal/revenue', {
      headers: { 'x-internal-secret': secretHeader || '' },
      cache: 'no-store'
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json({ message: "CRITICAL_ACCESS_GRANTED", data }, { status: 200 });
    } else {
      return NextResponse.json({ message: "Forbidden by Backend Vault" }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ message: "Internal Network Error" }, { status: 500 });
  }
}
