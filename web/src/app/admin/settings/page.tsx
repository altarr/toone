'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getUser()) {
      router.push('/admin/login');
      return;
    }

    apiFetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.page_title) setPageTitle(data.page_title);
      });
  }, [router]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'page_title', value: pageTitle }),
      });
      setMessage('Settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin')} className="text-muted hover:text-foreground text-sm">
            &larr; Back
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wider">Settings</h1>
        </div>

        {/* Page Title */}
        <div className="card mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red mb-4">Page Title</h2>
          <label className="field-label">Listener page title</label>
          <input
            type="text"
            className="input"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Toone"
          />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={saveSettings} className="btn-gradient" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && (
            <span className={`text-sm ${message.includes('Failed') ? 'text-error' : 'text-green-500'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
