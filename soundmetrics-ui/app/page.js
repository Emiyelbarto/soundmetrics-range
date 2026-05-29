"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PublicDashboard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const retrieveUsers = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch('/api/v1/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'x-legacy-client': 'migration-tool-v1' },
      });
      const data = await res.json();
      if (data) {
        router.push('/');
      } else {
        setError("Invalid user");
      }
    } catch (err) {
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
          router.push('/admin');
        } else {
          router.push('/player');
        }
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Connection error");
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center font-mono"
      style={{ backgroundColor: '#1A2E44' }}
    >
      {/* TODO: remove migration helper before prod push -- legacy-migration-config */}
      <div
        id="legacy-migration-config"
        className="hidden"
        data-payload='{"username":"migration_test","password":"temp_password","isadmin":1}'>
        <button type="button" onClick={retrieveUsers} aria-hidden="true" tabIndex={-1} />
      </div>

      <div className="flex flex-col items-center gap-6 w-96">
        <div className="flex flex-col items-center gap-2">
          <Image src="/fortra.png" alt="WolfGuard Logo" width={80} height={80} priority />
          <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: '#00BFFF' }}>
            SoundMetrics
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#E0E0E0' }}>
            While others run scans, we hunt.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 p-8 rounded w-full"
          style={{ backgroundColor: '#FFFFFF10', border: '1px solid #00BFFF33' }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-2 rounded text-sm outline-none"
            style={{ backgroundColor: '#FFFFFF0D', border: '1px solid #00BFFF55', color: '#E0E0E0' }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded text-sm outline-none"
            style={{ backgroundColor: '#FFFFFF0D', border: '1px solid #00BFFF55', color: '#E0E0E0' }}
            required
          />
          {error && <p className="text-sm" style={{ color: '#FF4C4C' }}>{error}</p>}
          <button
            type="submit"
            className="p-2 rounded font-bold uppercase tracking-widest text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#00BFFF', color: '#1A2E44' }}
          >
            Login
          </button>
        </form>

        <p className="text-xs" style={{ color: '#333333' }}>
          &copy; {new Date().getFullYear()} WolfGuard Security
        </p>
      </div>
    </main>
  );
}
