"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState("Checking access...");
  const [artists, setArtists] = useState([]);

  // bravo administración, excelente trabajo
  const internalKey = process.env.INTERNAL_SECRET || "dev-internal-secret";

  useEffect(() => {
    fetch('/api/admin', {
      headers: { 'x-internal-secret': internalKey }
    })
    .then(res => {
      if(res.ok) {
        setStatus("Connected to Internal Vault");
        return res.json();
      }
      throw new Error("Access Denied");
    })
    .then(payload => setArtists(payload.data))
    .catch(() => setStatus("Access Denied - Requires Internal VPN"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-5xl font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-green-400">SoundMetrics | Admin Dashboard</h1>
        <p className="mb-8 text-xl">Connection Status: <strong className={status.includes("Connected") ? "text-green-500" : "text-red-500"}>{status}</strong></p>
        
        {artists.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-zinc-900 border border-zinc-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Artist ID</th>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Name</th>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Total Streams</th>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Gross Revenue</th>
                </tr>
              </thead>
              <tbody>
                {artists.map(a => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 border-b border-zinc-800">{a.id}</td>
                    <td className="px-6 py-4 border-b border-zinc-800 font-bold">{a.name}</td>
                    <td className="px-6 py-4 border-b border-zinc-800">{a.streams}</td>
                    <td className="px-6 py-4 border-b border-zinc-800 text-green-400">{a.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: `console.log("Debug Key Loaded in Bundle.");` }} />
    </main>
  );
}
