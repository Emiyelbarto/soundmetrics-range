"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';

const internalKey = process.env.NEXTJS_INTERNAL_API_SECRET;

export default function AdminDashboard() {
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    document.cookie = "legacy_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiYWRtaW4ifQ.; path=/";
    fetch('/api/v2/admin', { headers: { 'x-internal-secret': internalKey } })
      .then(res => res.json())
      .then(payload => { if (payload.data) setArtists(payload.data); });
  }, []);

  return (
    <main
      className="flex min-h-screen flex-col items-center p-16 font-mono text-sm"
      style={{ backgroundColor: '#FFFFFF', color: '#333333' }}
    >
      <div className="w-full max-w-5xl">

        <div className="flex items-center gap-4 mb-10">
          <Image src="/logo-transparent.svg" alt="WolfGuard Logo" width={72} height={72} />
          <div>
            <h1 className="text-3xl font-bold tracking-widest uppercase" style={{ color: '#1A2E44' }}>
              SoundMetrics
            </h1>
            <p className="text-xs tracking-widest uppercase" style={{ color: '#333333', opacity: 0.5 }}>
              Admin Control Panel
            </p>
          </div>
        </div>

        <div
          className="p-6 rounded mb-6"
          style={{ backgroundColor: '#F5F7FA', border: '1px solid #00BFFF55' }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: '#1A2E44' }}
          >
            Artist Revenue Overview
          </h2>
          {artists.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <th className="py-2 pr-8 text-xs uppercase tracking-widest" style={{ color: '#333333', opacity: 0.5 }}>Artist</th>
                  <th className="py-2 pr-8 text-xs uppercase tracking-widest" style={{ color: '#333333', opacity: 0.5 }}>Streams</th>
                  <th className="py-2 text-xs uppercase tracking-widest" style={{ color: '#333333', opacity: 0.5 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {artists.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                    <td className="py-2 pr-8" style={{ color: '#333333' }}>{a.name}</td>
                    <td className="py-2 pr-8" style={{ color: '#333333', opacity: 0.6 }}>{a.streams}</td>
                    <td className="py-2 font-bold" style={{ color: '#00BFFF' }}>{a.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#333333', opacity: 0.4 }}>Loading revenue data...</p>
          )}
        </div>

        <div
          className="p-6 rounded"
          style={{ backgroundColor: '#F5F7FA', border: '1px solid #FF4C4C55' }}
        >
          <h2
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: '#CC0000' }}
          >
            Legacy Component Update (Beta)
          </h2>
          <form className="flex gap-4 items-center">
            <input type="file" style={{ color: '#333333', opacity: 0.6 }} />
            <button
              type="button"
              className="px-4 py-2 rounded font-bold uppercase tracking-widest text-xs transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#CC0000', color: '#FFFFFF' }}
            >
              Upload Patch
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
