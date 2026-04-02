'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import AudioPlayer from '@/components/AudioPlayer';

export default function ListenPage() {
  const [pageTitle, setPageTitle] = useState('Toone');

  useEffect(() => {
    apiFetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.page_title) setPageTitle(data.page_title);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-5">
      <div className="card w-full max-w-md mx-auto text-center">
        <div className="flex justify-center mb-6">
          <a href="/admin/login">
            <img src="/logo-full-white.svg" alt="Toone" className="h-10" />
          </a>
        </div>
        <h1 className="text-lg font-bold tracking-wide uppercase text-foreground mb-6">
          {pageTitle}
        </h1>
        <AudioPlayer />
      </div>
    </div>
  );
}
