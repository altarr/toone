import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createWebRtcTransport, getRouter } from '../media/mediasoup';
import {
  getStreamState,
  isLive,
  addProducer,
  setProducer,
  getProducerEntry,
  getChannelProducers,
  removeProducer,
  addConsumer,
  getConsumerEntry,
  addConsumerToEntry,
  removeConsumer,
  addWaitingConsumer,
  getWaitingConsumers,
  removeWaitingConsumer,
  setStateChangeCallback,
} from '../media/rooms';

function decodeToken(token: string): any | null {
  try {
    return jwt.verify(token, config.jwtSecret) as any;
  } catch {
    return null;
  }
}

export function setupSignaling(io: Server) {
  setStateChangeCallback((state) => {
    io.emit('streamState', state);
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.emit('streamState', getStreamState());

    // --- Producer (broadcaster) events ---

    socket.on('createProducerTransport', async (data, callback) => {
      try {
        const decoded = decodeToken(data.token);
        if (!decoded) throw new Error('Not authorized');

        const channel = data.channel || 'main';
        const { transport, params } = await createWebRtcTransport();
        addProducer(channel, socket.id, transport, decoded.username, decoded.role);

        callback({ params });
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('connectProducerTransport', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const entry = getProducerEntry(channel, socket.id);
        if (!entry) throw new Error('No producer transport');

        await entry.transport.connect({ dtlsParameters: data.dtlsParameters });
        callback({});
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('produce', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const entry = getProducerEntry(channel, socket.id);
        if (!entry) throw new Error('No producer transport');

        const producer = await entry.transport.produce({
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });

        setProducer(channel, socket.id, producer);

        producer.on('transportclose', () => {
          console.log('Producer transport closed');
        });

        callback({ id: producer.id });

        // Notify ALL waiting consumers on this channel that a producer is ready
        const waiting = getWaitingConsumers(channel);
        if (waiting.size > 0) {
          console.log(`Notifying ${waiting.size} waiting consumers on channel ${channel}`);
          for (const waitingSocketId of waiting) {
            io.to(waitingSocketId).emit('producerReady', { channel });
          }
        }

        io.emit('streamState', getStreamState());
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    // Pause/resume producer (for mute)
    socket.on('pauseProducer', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const entry = getProducerEntry(channel, socket.id);
        if (!entry || !entry.producer) throw new Error('No producer');
        await entry.producer.pause();
        callback?.({});
      } catch (err: any) {
        callback?.({ error: err.message });
      }
    });

    socket.on('resumeProducer', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const entry = getProducerEntry(channel, socket.id);
        if (!entry || !entry.producer) throw new Error('No producer');
        await entry.producer.resume();
        callback?.({});
      } catch (err: any) {
        callback?.({ error: err.message });
      }
    });

    // --- Consumer (listener) events ---

    socket.on('createConsumerTransport', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const { transport, params } = await createWebRtcTransport();
        addConsumer(channel, socket.id, transport);

        callback({ params });
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('connectConsumerTransport', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const consumerEntry = getConsumerEntry(channel, socket.id);
        if (!consumerEntry) throw new Error('No consumer transport');

        await consumerEntry.transport.connect({ dtlsParameters: data.dtlsParameters });
        callback({});
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('consume', async (data, callback) => {
      try {
        const channel = data.channel || 'main';
        const producers = getChannelProducers(channel);

        // No producers yet — tell client to wait, don't error
        if (!producers || producers.size === 0 || !hasActiveProducer(producers)) {
          addWaitingConsumer(channel, socket.id);
          callback({ waiting: true, channel });
          return;
        }

        const consumerEntry = getConsumerEntry(channel, socket.id);
        if (!consumerEntry) throw new Error('No consumer transport');

        const router = getRouter();
        const consumeResults: any[] = [];

        for (const [, producerEntry] of producers) {
          if (!producerEntry.producer) continue;

          if (
            !router.canConsume({
              producerId: producerEntry.producer.id,
              rtpCapabilities: data.rtpCapabilities,
            })
          ) {
            continue;
          }

          const consumer = await consumerEntry.transport.consume({
            producerId: producerEntry.producer.id,
            rtpCapabilities: data.rtpCapabilities,
            paused: false,
          });

          addConsumerToEntry(channel, socket.id, consumer);

          consumeResults.push({
            id: consumer.id,
            producerId: producerEntry.producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        }

        if (consumeResults.length === 0) {
          // Producers exist but none are consumable — wait
          addWaitingConsumer(channel, socket.id);
          callback({ waiting: true, channel });
          return;
        }

        // Remove from waiting list
        removeWaitingConsumer(channel, socket.id);

        if (consumeResults.length === 1) {
          callback(consumeResults[0]);
        } else {
          callback({ multiple: true, consumers: consumeResults });
        }
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('getRouterRtpCapabilities', (_data, callback) => {
      const router = getRouter();
      callback(router.rtpCapabilities);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      removeProducer(socket.id);
      removeConsumer(socket.id);
    });
  });
}

function hasActiveProducer(producers: Map<string, any>): boolean {
  for (const [, entry] of producers) {
    if (entry.producer) return true;
  }
  return false;
}
