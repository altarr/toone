import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  mediasoup: {
    listenIp: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn' as const,
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as any,
    },
    router: {
      mediaCodecs: [
        {
          kind: 'audio' as const,
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    },
    webRtcTransport: {
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};
