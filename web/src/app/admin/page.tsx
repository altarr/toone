'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, clearToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import StreamStatus from '@/components/StreamStatus';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [streamState, setStreamState] = useState<any>({ live: false, listenerCount: 0, channels: {} });

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/admin/login'); return; }
    if (u.must_change_password) { router.push('/admin/login'); return; }
    setUser(u);

    const socket = getSocket();
    socket.on('streamState', (state: any) => setStreamState(state));
    return () => { socket.off('streamState'); };
  }, [router]);

  const handleLogout = () => { clearToken(); router.push('/admin/login'); };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <img src="/logo-full-white.svg" alt="Toone" className="h-8" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">{user.username}</span>
            <button onClick={handleLogout} className="btn-outline text-xs py-1.5 px-3">Log Out</button>
          </div>
        </div>

        {/* Stream Status */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-red">Stream Status</h2>
            <StreamStatus live={streamState.live} listenerCount={streamState.listenerCount} />
          </div>

          {streamState.live && (
            <p className="text-xs text-muted">
              {streamState.listenerCount} listener{streamState.listenerCount !== 1 ? 's' : ''} connected
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/broadcast')}
            className="card hover:border-red transition-colors cursor-pointer text-left bg-red/5 border-red/30"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-red mb-2">Broadcaster</h3>
            <p className="text-xs text-muted">Open broadcast page</p>
          </button>

          <button
            onClick={() => window.open('/qr', '_blank')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">QR Page</h3>
            <p className="text-xs text-muted">QR code for attendees</p>
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Settings</h3>
            <p className="text-xs text-muted">Page title and display</p>
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Users</h3>
            <p className="text-xs text-muted">Manage accounts</p>
          </button>
        </div>
      </div>

    </div>
  );
}
