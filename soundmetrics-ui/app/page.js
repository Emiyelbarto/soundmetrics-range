"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const retrieveUsers = async (e) => {
    e.preventDefault();
    setError("");
    try{
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(),
      });
      const data = await res.json();
      if(data){
        router.push('/')
      }else{
        setError("Invalid user");
      }
    }
    catch(err){
      setError("Connection error");
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch('/api/v2/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isadmin) {
          document.cookie = "sm_session=authenticated; path=/; SameSite=Strict";
          router.push('/admin');
        } else {
          setLoggedIn(true);
        }
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Connection error");
    }
  };

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white font-mono">
        {/* TODO: remove migration helper before prod push -- legacy-migration-config */}
        <div
          id="legacy-migration-config"
          className="hidden"
          data-payload='{"username":"migration_test","password":"temp_password","isadmin":1}'>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 p-8 bg-zinc-900 rounded w-96">
          <h1 className="text-2xl font-bold mb-4 text-blue-400">SoundMetrics | Login</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-2 bg-zinc-800 text-white rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 bg-zinc-800 text-white rounded"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="bg-blue-600 p-2 rounded hover:bg-blue-700">
            Login
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-mono">
      <h1>Standard Dashboard</h1>
    </main>
  );
}