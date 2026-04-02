'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import StreamStatus from '@/components/StreamStatus';

const QR_STYLES = {
  red: { color: '#d71920', bg: '#ffffff', logo: '/art/TrendAI-Logo-Icon-Full-Color-RGB.png', logoBg: '#ffffff' },
  black: { color: '#000000', bg: '#ffffff', logo: '/art/TrendAI-Logo-Icon-Black-RGB.png', logoBg: '#ffffff' },
  white: { color: '#ffffff', bg: '#1a1a1a', logo: '/art/TrendAI-Logo-Icon-White-RGB.png', logoBg: '#1a1a1a' },
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderQr(
  canvas: HTMLCanvasElement,
  url: string,
  size: number,
  styleName: keyof typeof QR_STYLES = 'red'
) {
  const style = QR_STYLES[styleName];
  const QRCode = (await import('qrcode')).default;

  const tempCanvas = document.createElement('canvas');
  await QRCode.toCanvas(tempCanvas, url, {
    width: size,
    margin: 2,
    color: { dark: style.color, light: style.bg },
    errorCorrectionLevel: 'H',
  });

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(tempCanvas, 0, 0, size, size);

  const logo = await loadImage(style.logo);
  if (logo) {
    const logoArea = size * 0.22;
    const padding = logoArea * 0.18;
    const half = logoArea / 2 + padding;
    const cx = size / 2;
    const cy = size / 2;
    ctx.fillStyle = style.logoBg;
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    ctx.drawImage(logo, cx - logoArea / 2, cy - logoArea / 2, logoArea, logoArea);
  }
}

export default function QRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [pageTitle, setPageTitle] = useState('TrendAI Tune In');
  const [talkName, setTalkName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingTalk, setEditingTalk] = useState(false);
  const [talkInput, setTalkInput] = useState('');

  useEffect(() => {
    // Fetch settings
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/settings/public`)
      .then((r) => r.json())
      .then((data) => {
        if (data.page_title) setPageTitle(data.page_title);
        if (data.talk_name) setTalkName(data.talk_name);
      })
      .catch(() => {});

    // Check if admin (has token)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) setIsAdmin(true);

    const socket = getSocket();
    socket.on('streamState', (state: any) => {
      setLive(state.live);
      setListenerCount(state.listenerCount);
    });

    return () => { socket.off('streamState'); };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const listenUrl = `${window.location.origin}/listen`;
      renderQr(canvasRef.current, listenUrl, 500, 'red');
    }
  }, []);

  const handleSaveTalkName = async () => {
    await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ key: 'talk_name', value: talkInput }),
    });
    setTalkName(talkInput);
    setEditingTalk(false);
  };

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'trendai-tunein-qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-8 relative">
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 p-2 text-muted hover:text-foreground transition-colors"
        title="Toggle fullscreen"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      </button>

      <div className="flex flex-col items-center gap-6 max-w-lg w-full">
        <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-14" />

        <h1 className="text-2xl font-bold text-center tracking-wide uppercase text-foreground">
          {pageTitle}
        </h1>

        {/* Talk name */}
        {talkName && !editingTalk && (
          <div className="text-center">
            <p className="text-lg text-orange font-semibold">{talkName}</p>
          </div>
        )}

        {/* Admin inline edit for talk name */}
        {isAdmin && editingTalk && (
          <div className="flex gap-2 w-full max-w-sm">
            <input
              type="text"
              className="input flex-1"
              value={talkInput}
              onChange={(e) => setTalkInput(e.target.value)}
              placeholder="Enter talk/session name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTalkName()}
            />
            <button onClick={handleSaveTalkName} className="btn-gradient text-xs px-4">Save</button>
            <button onClick={() => setEditingTalk(false)} className="btn-outline text-xs px-3">Cancel</button>
          </div>
        )}

        {isAdmin && !editingTalk && (
          <button
            onClick={() => { setTalkInput(talkName); setEditingTalk(true); }}
            className="text-xs text-muted hover:text-red transition-colors"
          >
            {talkName ? 'Edit talk name' : '+ Set talk name'}
          </button>
        )}

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <canvas ref={canvasRef} />
        </div>

        <p className="text-foreground text-lg text-center uppercase tracking-wider font-bold">
          Scan to Join
        </p>
        <p className="text-muted text-sm text-center">
          Open your phone camera and scan the QR code above to register and tune in to the live broadcast.
        </p>

        <StreamStatus live={live} listenerCount={listenerCount} />

        {/* Download QR button (visible to admins) */}
        {isAdmin && (
          <button onClick={handleDownloadQr} className="btn-outline text-xs">
            Download QR Code
          </button>
        )}
      </div>
    </div>
  );
}
