"use client";
import Image from 'next/image';

const albums = [
  { title: 'BALLADS 1', artist: 'Joji', year: '2018', color: '#2A1F3D' },
  { title: 'Dawn FM', artist: 'The Weeknd', year: '2022', color: '#1A1A2E' },
  { title: 'Random Access Memories', artist: 'Daft Punk', year: '2013', color: '#1C2B1A' },
  { title: 'Nectar', artist: 'Joji', year: '2020', color: '#2B1A1A' },
  { title: 'After Hours', artist: 'The Weeknd', year: '2020', color: '#1A1F2B' },
  { title: 'Discovery', artist: 'Daft Punk', year: '2001', color: '#2B2A1A' },
];

const queue = [
  { title: 'Glimpse of Us', artist: 'Joji', duration: '3:54' },
  { title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20' },
  { title: 'Get Lucky', artist: 'Daft Punk', duration: '6:07' },
  { title: 'Slow Dancing in the Dark', artist: 'Joji', duration: '3:30' },
  { title: 'Starboy', artist: 'The Weeknd', duration: '3:50' },
];

export default function PlayerDashboard() {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#111922', fontFamily: 'ui-sans-serif, system-ui, sans-serif', overflow: 'hidden' }}>

      <aside style={{ width: '220px', backgroundColor: '#0D1720', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 28px' }}>
          <Image src="/fortra.png" alt="SoundMetrics" width={32} height={32} style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        {[['Home', '⌂'], ['Search', '⊙'], ['Your Library', '☰']].map(([label, icon]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', cursor: 'pointer', color: label === 'Home' ? '#FFFFFF' : '#9EB3C2', fontSize: '14px', fontWeight: label === 'Home' ? '600' : '400' }}>
            <span style={{ fontSize: '16px' }}>{icon}</span>{label}
          </div>
        ))}
        <div style={{ margin: '24px 16px 12px', borderTop: '1px solid #FFFFFF10' }} />
        <div style={{ padding: '0 20px 8px', fontSize: '11px', fontWeight: '600', color: '#9EB3C2', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Playlists</div>
        {['Top Streams 2024', 'Late Night Mix', 'Revenue Picks', 'Client Playlist'].map(p => (
          <div key={p} style={{ padding: '8px 20px', fontSize: '13px', color: '#9EB3C2', cursor: 'pointer' }}>{p}</div>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>Good evening</h1>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#00BFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#1A2E44' }}>
            S
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '36px' }}>
          {albums.slice(0, 3).map(a => (
            <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#FFFFFF12', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>{a.title}</span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px' }}>Featured Artists</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          {albums.map(a => (
            <div key={a.title} style={{ cursor: 'pointer' }}>
              <div style={{ aspectRatio: '1', backgroundColor: a.color, borderRadius: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '28px', opacity: 0.3 }}>♪</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
              <div style={{ fontSize: '12px', color: '#9EB3C2' }}>{a.artist} · {a.year}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', margin: '32px 0 16px' }}>Up Next</h2>
        <div>
          {queue.map((t, i) => (
            <div key={t.title} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px', borderRadius: '4px', color: i === 0 ? '#00BFFF' : '#E0E0E0' }}>
              <span style={{ width: '16px', fontSize: '13px', color: '#9EB3C2', textAlign: 'right' }}>{i === 0 ? '▶' : i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: i === 0 ? '600' : '400' }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: '#9EB3C2' }}>{t.artist}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#9EB3C2' }}>{t.duration}</span>
            </div>
          ))}
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '80px', backgroundColor: '#0D1720', borderTop: '1px solid #FFFFFF15', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '220px' }}>
          <div style={{ width: '44px', height: '44px', backgroundColor: '#2A1F3D', borderRadius: '3px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#FFFFFF' }}>Glimpse of Us</div>
            <div style={{ fontSize: '11px', color: '#9EB3C2' }}>Joji</div>
          </div>
          <span style={{ fontSize: '16px', color: '#00BFFF', marginLeft: '8px' }}>♡</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {['⇄', '⏮', '▶', '⏭', '↺'].map((btn, i) => (
              <button key={i} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: i === 2 ? '22px' : '14px', color: i === 2 ? '#FFFFFF' : '#9EB3C2', padding: 0 }}>{btn}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '400px' }}>
            <span style={{ fontSize: '11px', color: '#9EB3C2' }}>1:22</span>
            <div style={{ flex: 1, height: '3px', backgroundColor: '#FFFFFF20', borderRadius: '2px' }}>
              <div style={{ width: '35%', height: '100%', backgroundColor: '#00BFFF', borderRadius: '2px' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#9EB3C2' }}>3:54</span>
          </div>
        </div>
        <div style={{ width: '140px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '14px', color: '#9EB3C2' }}>▶</span>
          <div style={{ width: '80px', height: '3px', backgroundColor: '#FFFFFF20', borderRadius: '2px' }}>
            <div style={{ width: '70%', height: '100%', backgroundColor: '#E0E0E0', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

    </div>
  );
}
