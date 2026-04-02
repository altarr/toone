import { v4 as uuidv4 } from 'uuid';
import type { types as mediasoupTypes } from 'mediasoup';

interface ProducerEntry {
  transport: mediasoupTypes.WebRtcTransport;
  producer: mediasoupTypes.Producer | null;
  socketId: string;
  username: string;
  role: string;
}

interface ConsumerEntry {
  transport: mediasoupTypes.WebRtcTransport;
  consumers: mediasoupTypes.Consumer[];
  socketId: string;
}

interface ChannelInfo {
  producers: Map<string, ProducerEntry>;
  consumers: Map<string, ConsumerEntry>;
  waitingConsumers: Set<string>; // socket IDs waiting for a producer
}

interface StreamState {
  live: boolean;
  sessionId: string | null;
  title: string;
  startedAt: string | null;
}

let streamState: StreamState = {
  live: false,
  sessionId: null,
  title: 'TrendAI Tune In',
  startedAt: null,
};

const channels = new Map<string, ChannelInfo>();

let onStateChange: ((state: any) => void) | null = null;

export function setStateChangeCallback(cb: (state: any) => void) {
  onStateChange = cb;
}

function ensureChannel(channelId: string): ChannelInfo {
  if (!channels.has(channelId)) {
    channels.set(channelId, {
      producers: new Map(),
      consumers: new Map(),
      waitingConsumers: new Set(),
    });
  }
  return channels.get(channelId)!;
}

export function getStreamState() {
  const channelStatus: Record<string, any> = {};
  let totalListeners = 0;
  let totalWaiting = 0;

  for (const [id, channel] of channels) {
    const producers = Array.from(channel.producers.values()).map((p) => ({
      username: p.username,
      role: p.role,
      socketId: p.socketId,
    }));
    channelStatus[id] = {
      listenerCount: channel.consumers.size,
      waitingCount: channel.waitingConsumers.size,
      producers,
    };
    totalListeners += channel.consumers.size;
    totalWaiting += channel.waitingConsumers.size;
  }

  return {
    ...streamState,
    channels: channelStatus,
    listenerCount: totalListeners,
    waitingCount: totalWaiting,
  };
}

export function startStream(title?: string) {
  streamState = {
    live: true,
    sessionId: uuidv4(),
    title: title || streamState.title,
    startedAt: new Date().toISOString(),
  };
  ensureChannel('main');
  notifyStateChange();
  return getStreamState();
}

export function stopStream() {
  for (const [, channel] of channels) {
    for (const [, p] of channel.producers) {
      p.transport.close();
    }
    for (const [, c] of channel.consumers) {
      c.transport.close();
    }
    channel.waitingConsumers.clear();
  }
  channels.clear();

  streamState = {
    live: false,
    sessionId: null,
    title: streamState.title,
    startedAt: null,
  };
  notifyStateChange();
}

export function isLive() {
  return streamState.live;
}

// Producer management
export function addProducer(
  channelId: string,
  socketId: string,
  transport: mediasoupTypes.WebRtcTransport,
  username: string,
  role: string
) {
  const channel = ensureChannel(channelId);
  channel.producers.set(socketId, { transport, producer: null, socketId, username, role });
}

export function setProducer(channelId: string, socketId: string, producer: mediasoupTypes.Producer) {
  const channel = channels.get(channelId);
  if (!channel) return;
  const entry = channel.producers.get(socketId);
  if (entry) {
    entry.producer = producer;
    notifyStateChange();
  }
}

export function getProducerEntry(channelId: string, socketId: string) {
  return channels.get(channelId)?.producers.get(socketId);
}

export function getChannelProducers(channelId: string) {
  return channels.get(channelId)?.producers;
}

export function removeProducer(socketId: string) {
  for (const [, channel] of channels) {
    const entry = channel.producers.get(socketId);
    if (entry) {
      entry.transport.close();
      channel.producers.delete(socketId);
      notifyStateChange();
      return;
    }
  }
}

// Waiting consumer management
export function addWaitingConsumer(channelId: string, socketId: string) {
  const channel = ensureChannel(channelId);
  channel.waitingConsumers.add(socketId);
  notifyStateChange();
}

export function getWaitingConsumers(channelId: string): Set<string> {
  return channels.get(channelId)?.waitingConsumers || new Set();
}

export function removeWaitingConsumer(channelId: string, socketId: string) {
  channels.get(channelId)?.waitingConsumers.delete(socketId);
}

// Consumer management
export function addConsumer(
  channelId: string,
  socketId: string,
  transport: mediasoupTypes.WebRtcTransport
) {
  const channel = ensureChannel(channelId);
  channel.consumers.set(socketId, { transport, consumers: [], socketId });
  // Remove from waiting if was waiting
  channel.waitingConsumers.delete(socketId);
  notifyStateChange();
}

export function getConsumerEntry(channelId: string, socketId: string) {
  return channels.get(channelId)?.consumers.get(socketId);
}

export function addConsumerToEntry(channelId: string, socketId: string, consumer: mediasoupTypes.Consumer) {
  const entry = channels.get(channelId)?.consumers.get(socketId);
  if (entry) {
    entry.consumers.push(consumer);
  }
}

export function removeConsumer(socketId: string) {
  for (const [, channel] of channels) {
    const entry = channel.consumers.get(socketId);
    if (entry) {
      entry.transport.close();
      channel.consumers.delete(socketId);
      notifyStateChange();
      return;
    }
    // Also remove from waiting
    channel.waitingConsumers.delete(socketId);
  }
}

function notifyStateChange() {
  if (onStateChange) {
    onStateChange(getStreamState());
  }
}
