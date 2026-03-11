"use client";
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [artists, setArtists] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");

  const internalKey = process.env.INTERNAL_SECRET || "dev-internal-secret";

  useEffect(() => {
    document.cookie = "legacy_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOmZhbHNlLCJpYXQiOjE1MTYyMzkwMjJ9.8Cg88927IgaL_Baz5LHlGw7DaInjy0sJTG0Sv2sJcZc; path=/";
    
    fetch('/api/admin', { headers: { 'x-internal-secret': internalKey } })
      .then(res => res.json())
      .then(payload => { if(payload.data) setArtists(payload.data); });
      
    window.__DEBUG_METADATA__ = {
      app: process.env.APP_NAME,
      repo: process.env.GITLAB_SOURCE_REPO_URL,
      ci_usr: process.env.ARTIFACTORY_USR,
      ci_pwd: process.env.ARTIFACTORY_PWS
    };
  }, []);

  const handleUpload = (e) => {
    e.preventDefault();
    fetch('/api/admin', { method: 'POST', headers: { 'x-internal-secret': internalKey } })
      .then(res => res.json())
      .then(payload => setUploadStatus(payload.data?.message || "Upload Failed"));
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white font-mono text-sm">
      <div className="z-10 w-full max-w-5xl">
        <h1 className="text-4xl font-bold mb-8 text-green-400">SoundMetrics | Admin Control</h1>
        
        {/* CRUD Table */}
        <div className="mb-12 overflow-x-auto">
          <table className="min-w-full bg-zinc-900 border border-zinc-700">
             <thead>
                <tr>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Artist ID</th>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Name</th>
                  <th className="px-6 py-3 border-b border-zinc-700 text-left">Gross Revenue</th>
                </tr>
              </thead>
            <tbody>
              {artists.map(a => (
                <tr key={a.id} className="border-b border-zinc-800">
                  <td className="px-6 py-4">{a.id}</td>
                  <td className="px-6 py-4 font-bold">{a.name}</td>
                  <td className="px-6 py-4 text-green-400">{a.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-zinc-900 p-6 border border-zinc-700 rounded-md">
          <h2 className="text-xl font-bold mb-4 text-red-400">Legacy Component Update (Beta)</h2>
          <p className="mb-4 text-zinc-400 text-xs">Upload system module patches (.tar.gz, .php, .js). Executed by backend processor.</p>
          <form onSubmit={handleUpload} className="flex gap-4 items-center">
            <input type="file" className="text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700" />
            <button type="submit" className="bg-red-900 hover:bg-red-800 px-4 py-2 rounded font-bold transition-colors">Upload Patch</button>
          </form>
          {uploadStatus && <p className="mt-4 text-green-500 font-bold border-l-4 border-green-500 pl-2">{uploadStatus}</p>}
        </div>
      </div>
    </main>
  );
}
