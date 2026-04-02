'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import RegistrationForm from '@/components/RegistrationForm';
import AudioPlayer from '@/components/AudioPlayer';

export default function ListenPage() {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<any[]>([]);
  const [pageTitle, setPageTitle] = useState('TrendAI Tune In');
  const [languages, setLanguages] = useState<{ code: string; name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('main');
  const [streamState, setStreamState] = useState<any>({ live: false, channels: {} });

  useEffect(() => {
    if (sessionStorage.getItem('registered') === 'true') {
      setRegistered(true);
    }

    apiFetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.page_title) setPageTitle(data.page_title);
        if (data.registration_fields) setFields(data.registration_fields);
        if (data.languages) setLanguages(data.languages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    const socket = getSocket();
    socket.on('streamState', (state: any) => setStreamState(state));
    return () => { socket.off('streamState'); };
  }, []);

  const handleRegister = async (data: Record<string, string>) => {
    const res = await apiFetch('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    sessionStorage.setItem('registered', 'true');
    setRegistered(true);
  };

  const channelHasProducer = (ch: string) => {
    return streamState.channels?.[ch]?.producers?.length > 0;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5">
      {!registered ? (
        <RegistrationForm fields={fields} onSubmit={handleRegister} pageTitle={pageTitle} />
      ) : (
        <div className="card w-full max-w-md mx-auto text-center">
          <div className="flex justify-center mb-6">
            <a href="/admin/login">
              <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-10" />
            </a>
          </div>
          <h1 className="text-lg font-bold tracking-wide uppercase text-foreground mb-6">
            {pageTitle}
          </h1>

          {/* Language selector */}
          {languages.length > 0 && (
            <div className="mb-6">
              <label className="field-label mb-2 block">Select Language</label>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedChannel('main')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border-2 ${
                    selectedChannel === 'main'
                      ? 'bg-red border-red text-white'
                      : 'bg-card border-input-border text-muted hover:border-red'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${channelHasProducer('main') ? 'bg-green-400' : 'bg-muted-2'}`} />
                    Original
                  </span>
                </button>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedChannel(lang.code)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border-2 ${
                      selectedChannel === lang.code
                        ? 'bg-red border-red text-white'
                        : 'bg-card border-input-border text-muted hover:border-red'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${channelHasProducer(lang.code) ? 'bg-green-400' : 'bg-muted-2'}`} />
                      {lang.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AudioPlayer channel={selectedChannel} />
        </div>
      )}
    </div>
  );
}
