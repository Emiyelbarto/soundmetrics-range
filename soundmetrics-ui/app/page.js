"use client";
import { useState } from 'react';

export default function PublicDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [artists, setArtists] = useState([]);
  const [query, setQuery] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setLoggedIn(true);
    fetchArtists("");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchArtists(query);
  };

  const fetchArtists = (q) => {
    fetch(`/api/public/artists?q=${q}`)
      .then(res => res.json())
      .then(data => setArtists(data));
  };

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white font-mono">
        <form onSubmit={handleLogin} className="flex flex-col gap-4 p-8 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl w-96">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-400">SoundMetrics Access</h1>
          <input type="text" placeholder="Username" className="p-2 bg-zinc-800 rounded border border-zinc-700 focus:outline-none focus:border-blue-500" required />
          <input type="password" placeholder="Password" className="p-2 bg-zinc-800 rounded border border-zinc-700 focus:outline-none focus:border-blue-500" required />
          <button type="submit" className="bg-blue-600 p-2 rounded font-bold hover:bg-blue-500 transition-colors">Login</button>
          <p className="text-xs text-zinc-500 text-center mt-2">v2.4.1 - Standard Access Only</p>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white font-mono">
      <div className="z-10 w-full max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">Standard Dashboard</h1>
          <span className="bg-zinc-800 px-3 py-1 rounded text-xs">Read-Only</span>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Search artists..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-2 bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 px-4 rounded hover:bg-blue-500 transition-colors">Search</button>
        </form>

        <ul className="bg-zinc-900 p-6 border border-zinc-700 rounded-md">
          {artists.length === 0 ? <li className="text-zinc-500">No artists found.</li> : null}
          {artists.map(a => (
            <li key={a.id} className="border-b border-zinc-800 py-3 flex justify-between">
              <span className="font-bold">{a.name}</span>
              <span className="text-zinc-400">{a.streams} streams</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
