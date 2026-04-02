'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import { getSocket } from '@/lib/socket';
import StreamStatus from './StreamStatus';

type PlayerStatus = 'idle' | 'connecting' | 'waiting' | 'waiting-for-producer' | 'playing' | 'ended' | 'error';

export default function AudioPlayer() {
  const channel = 'main';
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [live, setLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<any>(null);
  const consumingRef = useRef(false);
  const statusRef = useRef<PlayerStatus>('idle');

  statusRef.current = status;

  const cleanup = useCallback(() => {
    try { transportRef.current?.close(); } catch {}
    transportRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    consumingRef.current = false;
  }, []);

  const ensureDevice = useCallback(async () => {
    if (deviceRef.current) return deviceRef.current;
    const socket = getSocket();
    const device = new Device();
    const rtpCapabilities = await new Promise<any>((resolve, reject) => {
      socket.emit('getRouterRtpCapabilities', {}, (caps: any) => {
        if (caps.error) reject(new Error(caps.error));
        else resolve(caps);
      });
    });
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  }, []);

  const startConsuming = useCallback(async () => {
    if (consumingRef.current) return;
    consumingRef.current = true;
    setStatus('connecting');

    const socket = getSocket();
    const ch = channel;

    try {
      const device = await ensureDevice();

      // Create consumer transport
      const transportParams = await new Promise<any>((resolve, reject) => {
        socket.emit('createConsumerTransport', { channel: ch }, (data: any) => {
          if (data.error) reject(new Error(data.error));
          else resolve(data.params);
        });
      });

      const transport = device.createRecvTransport(transportParams);
      transportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectConsumerTransport', { dtlsParameters, channel: ch }, (res: any) => {
          if (res.error) errback(new Error(res.error));
          else callback();
        });
      });

      // Try to consume
      const consumerData = await new Promise<any>((resolve, reject) => {
        socket.emit(
          'consume',
          { rtpCapabilities: device.rtpCapabilities, channel: ch },
          (data: any) => {
            if (data.error) reject(new Error(data.error));
            else resolve(data);
          }
        );
      });

      // Server says no producer yet - wait for producerReady
      if (consumerData.waiting) {
        setStatus('waiting-for-producer');
        consumingRef.current = false; // allow re-consume when producer appears
        return;
      }

      // Got consumer data - play audio
      await playConsumerData(transport, consumerData);
      setStatus('playing');
    } catch (err: any) {
      console.error('Failed to consume:', err);
      setErrorMsg(err.message);
      setStatus('error');
      consumingRef.current = false;
    }
  }, [ensureDevice]);

  const playConsumerData = async (transport: any, consumerData: any) => {
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
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      await audioRef.current.play();
    }
  };

  // Re-consume when producer becomes available (for waiting-for-producer state)
  const retryConsume = useCallback(async () => {
    const socket = getSocket();
    const ch = channel;
    const device = deviceRef.current;
    const transport = transportRef.current;

    if (!device || !transport) {
      // No transport - do full reconnect
      cleanup();
      startConsuming();
      return;
    }

    try {
      const consumerData = await new Promise<any>((resolve, reject) => {
        socket.emit(
          'consume',
          { rtpCapabilities: device.rtpCapabilities, channel: ch },
          (data: any) => {
            if (data.error) reject(new Error(data.error));
            else resolve(data);
          }
        );
      });

      if (consumerData.waiting) {
        // Still waiting - keep state
        return;
      }

      await playConsumerData(transport, consumerData);
      consumingRef.current = true;
      setStatus('playing');
    } catch (err: any) {
      console.error('Retry consume failed:', err);
      // Stay in waiting state - will retry on next producerReady
    }
  }, [cleanup, startConsuming]);

  // Socket handlers - registered once
  useEffect(() => {
    const socket = getSocket();

    const handleStreamState = (state: any) => {
      setLive(state.live);
      setListenerCount(state.listenerCount);
      setWaitingCount(state.waitingCount || 0);

      // Stream ended while we were playing or waiting for producer
      if (!state.live) {
        const cur = statusRef.current;
        if (cur === 'playing' || cur === 'waiting-for-producer' || cur === 'connecting') {
          cleanup();
          setStatus('ended');
        }
      }
    };

    const handleProducerReady = (data: any) => {
      const ch = channel;
      if (data.channel === ch && statusRef.current === 'waiting-for-producer') {
        console.log('Producer ready on channel', ch, '- retrying consume');
        retryConsume();
      }
    };

    const handleConnect = () => {
      if (statusRef.current === 'idle') {
        setStatus('waiting');
      }
    };

    const handleDisconnect = () => {
      cleanup();
      setStatus('idle');
    };

    socket.on('streamState', handleStreamState);
    socket.on('producerReady', handleProducerReady);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    if (socket.connected) {
      setStatus('waiting');
    }

    return () => {
      socket.off('streamState', handleStreamState);
      socket.off('producerReady', handleProducerReady);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTapToListen = () => {
    cleanup();
    startConsuming();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <StreamStatus live={live} listenerCount={listenerCount} />
      <audio ref={audioRef} autoPlay playsInline />

      {/* Idle - waiting for socket connection */}
      {status === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-muted">Connecting...</p>
        </div>
      )}

      {/* Connected, waiting for stream to start */}
      {status === 'waiting' && !live && (
        <div className="text-center">
          <p className="text-muted text-sm">Waiting for broadcast to begin...</p>
        </div>
      )}

      {/* Stream is live, user can tap to listen */}
      {status === 'waiting' && live && (
        <button onClick={handleTapToListen} className="btn-gradient text-lg px-12 py-4">
          Tap to Listen
        </button>
      )}

      {/* Connecting to stream */}
      {status === 'connecting' && (
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-muted">Connecting to stream...</p>
        </div>
      )}

      {/* Connected but waiting for speaker to start broadcasting */}
      {status === 'waiting-for-producer' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 bg-muted rounded-full"
                style={{
                  height: `${8 + (i % 3) * 6}px`,
                  animation: `pulse-live 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted">Connected - waiting for speaker...</p>
          <p className="text-xs text-muted-2">You will hear audio automatically when the speaker begins</p>
        </div>
      )}

      {/* Playing audio */}
      {status === 'playing' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red" style={{ animation: 'pulse-live 1s ease-in-out infinite' }} />
            <span className="text-foreground font-semibold text-sm uppercase tracking-wide">Listening</span>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-1 bg-red rounded-full"
                style={{
                  height: `${10 + (i % 4) * 7}px`,
                  animation: `pulse-live ${0.4 + (i % 3) * 0.2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stream ended - rejoin button */}
      {status === 'ended' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted text-sm">Broadcast ended</p>
          <button onClick={handleTapToListen} className="btn-gradient px-8 py-3">
            Tap to Rejoin
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center">
          <p className="text-error text-sm">{errorMsg || 'Connection failed'}</p>
          <button onClick={handleTapToListen} className="btn-outline mt-4">Retry</button>
        </div>
      )}
    </div>
  );
}
