'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Device } from 'mediasoup-client';
import { getUser, getToken } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import StreamStatus from '@/components/StreamStatus';

type Status = 'idle' | 'connecting' | 'live' | 'error';

export default function BroadcastPage() {
  const router = useRouter();
  const user = getUser();
  const [status, setStatus] = useState<Status>('idle');
  const [muted, setMuted] = useState(false);
  // panelist uses same mute toggle as everyone else
  const [streamState, setStreamState] = useState<any>({ live: false, listenerCount: 0, channels: {} });
  const [error, setError] = useState('');
  const [monitorConnected, setMonitorConnected] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(80);

  const [playingFile, setPlayingFile] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<any>(null);
  const producerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mixedDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const fileSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileGainRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Translator monitor refs
  const monitorTransportRef = useRef<any>(null);
  const monitorAudioRef = useRef<HTMLAudioElement>(null);

  const isPanelist = user?.role === 'panelist';
  const isAdmin = user?.role === 'admin';
  const isSpeaker = user?.role === 'speaker';
  const isTranslator = user?.role === 'translator';
  const canStartStop = isAdmin || isSpeaker;

  const channel = isTranslator ? (user?.language || 'main') : 'main';
  const channelLabel = isTranslator ? `Translation: ${user?.language?.toUpperCase()}` : 'Main';

  useEffect(() => {
    if (!user || user.must_change_password) {
      router.push('/admin/login');
      return;
    }
    const socket = getSocket();
    socket.on('streamState', (state: any) => setStreamState(state));
    return () => { socket.off('streamState'); };
  }, [router]);

  // Update monitor volume
  useEffect(() => {
    if (monitorAudioRef.current) {
      monitorAudioRef.current.volume = monitorVolume / 100;
    }
  }, [monitorVolume]);

  const ensureDevice = async () => {
    if (deviceRef.current) return deviceRef.current;
    const device = new Device();
    const socket = getSocket();
    const rtpCapabilities = await new Promise<any>((resolve, reject) => {
      socket.emit('getRouterRtpCapabilities', {}, (caps: any) => {
        if (caps.error) reject(new Error(caps.error));
        else resolve(caps);
      });
    });
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  };

  // Translator: connect to main channel as listener
  const startMonitor = async () => {
    try {
      const device = await ensureDevice();
      const socket = getSocket();

      const transportParams = await new Promise<any>((resolve, reject) => {
        socket.emit('createConsumerTransport', { channel: 'main' }, (data: any) => {
          if (data.error) reject(new Error(data.error));
          else resolve(data.params);
        });
      });

      const transport = device.createRecvTransport(transportParams);
      monitorTransportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectConsumerTransport', { dtlsParameters, channel: 'main' }, (res: any) => {
          if (res.error) errback(new Error(res.error));
          else callback();
        });
      });

      const consumerData = await new Promise<any>((resolve, reject) => {
        socket.emit('consume', { rtpCapabilities: device.rtpCapabilities, channel: 'main' }, (data: any) => {
          if (data.error) reject(new Error(data.error));
          else resolve(data);
        });
      });

      const consumerParams = consumerData.multiple ? consumerData.consumers : [consumerData];
      const tracks: MediaStreamTrack[] = [];

      for (const params of consumerParams) {
        const consumer = await transport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });
        tracks.push(consumer.track);
      }

      const stream = new MediaStream(tracks);
      if (monitorAudioRef.current) {
        monitorAudioRef.current.srcObject = stream;
        monitorAudioRef.current.volume = monitorVolume / 100;
        await monitorAudioRef.current.play();
      }
      setMonitorConnected(true);
    } catch (err: any) {
      console.error('Monitor error:', err);
      // Non-fatal — translator can still broadcast without monitor
    }
  };

  const handleStartStream = async () => {
    await apiFetch('/api/stream/start', { method: 'POST', body: JSON.stringify({}) });
  };

  const handleStopStream = async () => {
    await apiFetch('/api/stream/stop', { method: 'POST' });
  };

  const startBroadcast = async () => {
    setStatus('connecting');
    setError('');

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const mixedDest = ctx.createMediaStreamDestination();
      mixedDestRef.current = mixedDest;

      const micSource = ctx.createMediaStreamSource(micStream);
      const micGain = ctx.createGain();
      micGainRef.current = micGain;
      micGain.gain.value = 1.0;
      micSource.connect(micGain);
      micGain.connect(mixedDest);

      const fileGain = ctx.createGain();
      fileGainRef.current = fileGain;
      fileGain.gain.value = 1.0;
      fileGain.connect(mixedDest);

      const mixedStream = mixedDest.stream;
      streamRef.current = micStream;

      const device = await ensureDevice();
      const socket = getSocket();
      const token = getToken();

      const transportParams = await new Promise<any>((resolve, reject) => {
        socket.emit('createProducerTransport', { token, channel }, (data: any) => {
          if (data.error) reject(new Error(data.error));
          else resolve(data.params);
        });
      });

      const transport = device.createSendTransport(transportParams);
      transportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectProducerTransport', { dtlsParameters, channel }, (res: any) => {
          if (res.error) errback(new Error(res.error));
          else callback();
        });
      });

      transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        socket.emit('produce', { kind, rtpParameters, channel, paused: isPanelist }, (res: any) => {
          if (res.error) errback(new Error(res.error));
          else callback({ id: res.id });
        });
      });

      const mixedTrack = mixedStream.getAudioTracks()[0];
      const producer = await transport.produce({ track: mixedTrack });
      producerRef.current = producer;

      if (isPanelist) {
        micGain.gain.value = 0;
        setMuted(true);
      } else {
        setMuted(false);
      }

      setStatus('live');

      // Translator: auto-connect monitor to main channel
      if (isTranslator) {
        startMonitor();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start broadcast');
      setStatus('error');
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  };

  const stopBroadcast = async () => {
    producerRef.current?.close();
    producerRef.current = null;
    transportRef.current?.close();
    transportRef.current = null;
    monitorTransportRef.current?.close();
    monitorTransportRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (monitorAudioRef.current) monitorAudioRef.current.srcObject = null;
    setMonitorConnected(false);
    setStatus('idle');
    setMuted(false);
  };

  const toggleMute = () => {
    if (!micGainRef.current) return;
    const newMuted = !muted;
    micGainRef.current.gain.value = newMuted ? 0 : 1;
    setMuted(newMuted);
  };

  // Push-to-talk removed — panelists now use same mute toggle as speakers

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioCtxRef.current) return;
    setAudioFileName(file.name);
    const arrayBuffer = await file.arrayBuffer();
    audioBufferRef.current = await audioCtxRef.current.decodeAudioData(arrayBuffer);
  };

  const togglePlayFile = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !fileGainRef.current) return;

    if (playingFile && fileSourceRef.current) {
      fileSourceRef.current.stop();
      fileSourceRef.current = null;
      setPlayingFile(false);
      return;
    }

    if (!audioBufferRef.current) {
      fileInputRef.current?.click();
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(fileGainRef.current);
    source.onended = () => setPlayingFile(false);
    source.start();
    fileSourceRef.current = source;
    setPlayingFile(true);
  };

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md text-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/admin')} className="text-muted hover:text-foreground text-sm">
            &larr; Back
          </button>
          <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-8" />
          <div className="w-12" />
        </div>

        <h1 className="text-lg font-bold uppercase tracking-wider mb-2">Broadcast</h1>
        <p className="text-xs text-muted mb-6">
          Channel: <span className="text-foreground font-semibold">{channelLabel}</span>
        </p>

        {/* Stream control */}
        {canStartStop && (
          <div className="mb-8 flex justify-center gap-3">
            {!streamState.live ? (
              <button onClick={handleStartStream} className="btn-gradient">Start Stream</button>
            ) : (
              isAdmin && (
                <button onClick={handleStopStream} className="btn-outline border-error text-error hover:bg-error hover:text-white hover:border-error">
                  Stop Stream
                </button>
              )
            )}
          </div>
        )}

        {/* Status */}
        <div className="mb-6 flex flex-col items-center gap-1">
          <StreamStatus live={streamState.live} listenerCount={streamState.listenerCount} />
          {(streamState.waitingCount > 0) && (
            <span className="text-xs text-muted">
              {streamState.waitingCount} waiting to connect
            </span>
          )}
        </div>

        {/* Hidden monitor audio element for translators */}
        <audio ref={monitorAudioRef} autoPlay playsInline />

        {/* Big broadcast button — shows when stream is live and not yet broadcasting */}
        {streamState.live && status !== 'live' && (
          <div className="flex justify-center mb-4">
            <button
              onClick={startBroadcast}
              disabled={status === 'connecting'}
              className="w-36 h-36 rounded-full border-[3px] bg-card border-input-border hover:border-red transition-all flex items-center justify-center"
            >
              {status === 'connecting' ? (
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#888">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Live controls — same for speaker, translator, admin, and panelist */}
        {status === 'live' && (
          <>
            <div className="flex justify-center mb-4">
              <button
                onClick={stopBroadcast}
                className="w-36 h-36 rounded-full border-[3px] bg-red border-red shadow-[0_0_40px_rgba(215,25,32,0.3)] transition-all flex items-center justify-center"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
            <p className="text-muted text-sm font-semibold">Tap to stop broadcasting</p>

            {/* Translator monitor panel */}
            {isTranslator && (
              <div className="mt-6 card text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Monitoring: Main Channel
                  </span>
                  <span className={`w-2 h-2 rounded-full ${monitorConnected ? 'bg-green-400' : 'bg-muted-2'}`} />
                </div>
                <p className="text-[11px] text-muted mb-3">
                  {monitorConnected
                    ? 'You are hearing the main speaker. Speak your translation into the mic.'
                    : 'Connecting to main channel...'}
                </p>
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#888">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={monitorVolume}
                    onChange={(e) => setMonitorVolume(parseInt(e.target.value))}
                    className="flex-1 accent-red h-1"
                  />
                  <span className="text-xs text-muted w-8 text-right">{monitorVolume}%</span>
                </div>
              </div>
            )}

            {/* Mute + Audio File */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={toggleMute}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 transition-all text-sm font-bold uppercase tracking-wide ${
                  muted
                    ? 'bg-orange/20 border-orange text-orange'
                    : 'bg-card border-input-border text-muted hover:border-foreground hover:text-foreground'
                }`}
              >
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
                {muted ? 'Muted' : 'Mute'}
              </button>

              <button
                onClick={togglePlayFile}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 transition-all text-sm font-bold uppercase tracking-wide ${
                  playingFile
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-card border-input-border text-muted hover:border-foreground hover:text-foreground'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  {playingFile ? (
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
                {playingFile ? 'Stop' : audioFileName ? 'Play' : 'Audio'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {audioFileName && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="text-xs text-muted truncate max-w-[200px]">{audioFileName}</span>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-red hover:text-foreground">Change</button>
              </div>
            )}

            {muted && (
              <p className="text-orange text-xs font-bold uppercase tracking-wider mt-4">Microphone muted</p>
            )}

            {!muted && (
              <div className="flex justify-center gap-1 mt-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red rounded-full"
                    style={{
                      height: `${12 + (i % 5) * 8}px`,
                      animation: `pulse-live ${0.5 + (i % 4) * 0.15}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Waiting messages */}
        {!streamState.live && status === 'idle' && (
          <p className="text-muted text-sm mt-4">
            {canStartStop ? 'Start the stream to begin broadcasting.' : 'Waiting for stream to start...'}
          </p>
        )}

        {status === 'idle' && streamState.live && (
          <p className="text-muted text-sm">Tap the mic to start broadcasting</p>
        )}

        {error && <p className="text-error text-sm mt-6">{error}</p>}
        {status === 'error' && (
          <button onClick={() => setStatus('idle')} className="btn-outline mt-4">Try Again</button>
        )}
      </div>
    </div>
  );
}
