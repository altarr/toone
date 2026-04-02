import * as mediasoup from 'mediasoup';
import { config } from '../config';

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

export async function createWorker() {
  worker = await mediasoup.createWorker(config.mediasoup.worker);

  worker.on('died', () => {
    console.error('mediasoup Worker died, exiting...');
    process.exit(1);
  });

  router = await worker.createRouter({
    mediaCodecs: config.mediasoup.router.mediaCodecs,
  });

  console.log('mediasoup Worker and Router created');
  return { worker, router };
}

export function getRouter() {
  return router;
}

export async function createWebRtcTransport() {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: config.mediasoup.listenIp,
        announcedIp: config.mediasoup.announcedIp,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate:
      config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
  });

  if (config.mediasoup.webRtcTransport.maxIncomingBitrate) {
    try {
      await transport.setMaxIncomingBitrate(
        config.mediasoup.webRtcTransport.maxIncomingBitrate
      );
    } catch {}
  }

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}
