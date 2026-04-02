'use client';

interface StreamStatusProps {
  live: boolean;
  listenerCount?: number;
}

export default function StreamStatus({ live, listenerCount }: StreamStatusProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            live ? 'bg-red' : 'bg-muted-2'
          }`}
          style={live ? { animation: 'pulse-live 2s ease-in-out infinite' } : {}}
        />
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            live ? 'text-red' : 'text-muted'
          }`}
        >
          {live ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      {live && listenerCount !== undefined && (
        <span className="text-xs text-muted">
          {listenerCount} listener{listenerCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
