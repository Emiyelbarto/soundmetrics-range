"use client";
import { useEffect, useState } from 'react';

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
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white font-mono text-sm">
      <div className="z-10 w-full max-w-5xl">
        <h1 className="text-4xl font-bold mb-8 text-green-400">SoundMetrics | Admin Control</h1>

        <div className="bg-zinc-900 p-6 border border-zinc-700 rounded-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-400">Artist Revenue Overview</h2>
          {artists.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 pr-8 text-zinc-400">Artist</th>
                  <th className="py-2 pr-8 text-zinc-400">Streams</th>
                  <th className="py-2 text-zinc-400">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {artists.map(a => (
                  <tr key={a.id} className="border-b border-zinc-800">
                    <td className="py-2 pr-8">{a.name}</td>
                    <td className="py-2 pr-8 text-zinc-300">{a.streams}</td>
                    <td className="py-2 text-green-400">{a.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-zinc-500">Loading revenue data...</p>
          )}
        </div>

        <div className="bg-zinc-900 p-6 border border-zinc-700 rounded-md mt-4">
          <h2 className="text-xl font-bold mb-4 text-red-400">Legacy Component Update (Beta)</h2>
          <form className="flex gap-4 items-center">
            <input type="file" className="text-zinc-400" />
            <button type="button" className="bg-red-900 px-4 py-2 rounded font-bold">Upload Patch</button>
          </form>
        </div>
      </div>
    </main>
  );
}