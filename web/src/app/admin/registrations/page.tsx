'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch, API_BASE } from '@/lib/api';

export default function RegistrationsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) {
      router.push('/admin/login');
      return;
    }
    loadRegistrations();
  }, [router]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/registrations');
      const data = await res.json();
      setRegistrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`${API_BASE}/api/registrations/export?token=${token}`, '_blank');
  };

  const handleClear = async () => {
    if (!confirm('Delete all registrations? This cannot be undone.')) return;
    await apiFetch('/api/registrations', { method: 'DELETE' });
    loadRegistrations();
  };

  // Get all unique field keys
  const allKeys = new Set<string>();
  registrations.forEach((r) => Object.keys(r.data).forEach((k) => allKeys.add(k)));
  const fieldKeys = Array.from(allKeys);

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-10">
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin')} className="text-muted hover:text-foreground text-sm">
            &larr; Back
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wider">Registrations</h1>
          <span className="text-xs text-muted bg-input-bg px-3 py-1 rounded-full">
            {registrations.length} total
          </span>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={handleExport} className="btn-gradient">
            Export CSV
          </button>
          <button onClick={handleClear} className="btn-outline border-error text-error hover:bg-error hover:text-white hover:border-error">
            Clear All
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-muted">No registrations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider text-muted">
                    #
                  </th>
                  {fieldKeys.map((k) => (
                    <th
                      key={k}
                      className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider text-muted"
                    >
                      {k}
                    </th>
                  ))}
                  <th className="text-left py-3 px-2 text-xs font-bold uppercase tracking-wider text-muted">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, i) => (
                  <tr key={r.id} className="border-b border-card-border/50 hover:bg-input-bg/50">
                    <td className="py-2.5 px-2 text-muted">{i + 1}</td>
                    {fieldKeys.map((k) => (
                      <td key={k} className="py-2.5 px-2 text-foreground">
                        {r.data[k] || '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-2 text-muted text-xs">
                      {new Date(r.registered_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
