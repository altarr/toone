'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, clearToken } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import StreamStatus from '@/components/StreamStatus';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [streamState, setStreamState] = useState<any>({ live: false, listenerCount: 0, channels: {} });
  const [showLinkQr, setShowLinkQr] = useState(false);
  const linkQrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/admin/login'); return; }
    if (u.must_change_password) { router.push('/admin/login'); return; }
    if (u.role !== 'admin') { router.push('/admin/broadcast'); return; }
    setUser(u);

    const socket = getSocket();
    socket.on('streamState', (state: any) => setStreamState(state));
    return () => { socket.off('streamState'); };
  }, [router]);

  useEffect(() => {
    if (showLinkQr && linkQrCanvasRef.current) {
      import('qrcode').then((QRCode) => {
        QRCode.default.toCanvas(linkQrCanvasRef.current, window.location.origin, {
          width: 280, margin: 2,
          color: { dark: '#d71920', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
      });
    }
  }, [showLinkQr]);

  const handleLogout = () => { clearToken(); router.push('/admin/login'); };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-8" />
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

          {streamState.live && streamState.channels && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(streamState.channels).map(([ch, info]: [string, any]) => (
                <div key={ch} className="bg-input-bg rounded-lg p-3 border border-input-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {ch === 'main' ? 'Main' : ch.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted">
                      {info.listenerCount} listener{info.listenerCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {info.producers?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {info.producers.map((p: any, i: number) => (
                        <span key={i} className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                          {p.username} ({p.role})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Tune In Page</h3>
            <p className="text-xs text-muted">QR code for attendees</p>
          </button>

          <button
            onClick={() => setShowLinkQr(true)}
            className="card hover:border-red transition-colors cursor-pointer text-left border-dashed"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Link App</h3>
            <p className="text-xs text-muted">Connect broadcaster app via QR</p>
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Settings</h3>
            <p className="text-xs text-muted">Page title, fields, languages</p>
          </button>

          <button
            onClick={() => router.push('/admin/registrations')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Registrations</h3>
            <p className="text-xs text-muted">View & export attendee data</p>
          </button>

          <button
            onClick={() => router.push('/admin/users')}
            className="card hover:border-red transition-colors cursor-pointer text-left"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">Users</h3>
            <p className="text-xs text-muted">Manage accounts & roles</p>
          </button>
        </div>
      </div>

      {/* Link App QR Modal */}
      {showLinkQr && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-5" onClick={() => setShowLinkQr(false)}>
          <div className="card max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-red mb-4">Link Broadcaster App</h2>
            <p className="text-xs text-muted mb-4">Scan this QR code from the mobile app to connect.</p>
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <canvas ref={linkQrCanvasRef} />
            </div>
            <p className="text-xs text-muted-2 mb-4 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}</p>
            <button onClick={() => setShowLinkQr(false)} className="btn-outline w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
