'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const inviteCanvasRef = useRef<HTMLCanvasElement>(null);

  const currentUser = getUser();

  useEffect(() => {
    if (!currentUser) { router.push('/admin/login'); return; }
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/invites'),
      ]);
      setUsers(await usersRes.json());
      setInvites(await invitesRes.json());
    } catch {}
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewUsername(''); setNewPassword(''); setShowAdd(false);
      loadAll();
    } catch (err: any) { setError(err.message); }
    setAdding(false);
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const handleCreateInvite = async () => {
    const res = await apiFetch('/api/invites', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setInviteCode(data.code);
    loadAll();
  };

  useEffect(() => {
    if (inviteCode && inviteCanvasRef.current) {
      const url = `${window.location.origin}/invite/${inviteCode}`;
      import('qrcode').then((QRCode) => {
        QRCode.default.toCanvas(inviteCanvasRef.current, url, {
          width: 250, margin: 2,
          color: { dark: '#d71920', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
      });
    }
  }, [inviteCode]);

  const handleDeleteInvite = async (id: number) => {
    await apiFetch(`/api/invites/${id}`, { method: 'DELETE' });
    loadAll();
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin')} className="text-muted hover:text-foreground text-sm">&larr; Back</button>
          <h1 className="text-lg font-bold uppercase tracking-wider">Users</h1>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => { setShowAdd(!showAdd); setShowInvite(false); }} className="btn-gradient">
            {showAdd ? 'Cancel' : 'Add User'}
          </button>
          <button onClick={() => { setShowInvite(!showInvite); setShowAdd(false); setInviteCode(''); }} className="btn-outline">
            {showInvite ? 'Cancel' : 'Invite via QR'}
          </button>
        </div>

        {/* Add user form */}
        {showAdd && (
          <form onSubmit={handleAdd} className="card mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-red mb-4">New User</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="field-label">Username</label>
                <input type="text" className="input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
            </div>
            {error && <p className="text-error text-sm mb-3">{error}</p>}
            <button type="submit" className="btn-gradient" disabled={adding}>{adding ? 'Adding...' : 'Create User'}</button>
          </form>
        )}

        {/* Invite QR */}
        {showInvite && (
          <div className="card mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-red mb-4">Generate Invite QR</h2>
            {!inviteCode ? (
              <button onClick={handleCreateInvite} className="btn-gradient">Generate QR Code</button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted mb-3">Scan this QR to create an account</p>
                <div className="bg-white rounded-xl p-4 inline-block mb-3">
                  <canvas ref={inviteCanvasRef} />
                </div>
                <p className="text-xs text-muted-2 break-all mb-4">
                  {typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteCode}` : ''}
                </p>
                <button onClick={() => setInviteCode('')} className="btn-outline text-xs">Generate Another</button>
              </div>
            )}
          </div>
        )}

        {/* Active invites */}
        {invites.filter((i: any) => !i.used_by).length > 0 && (
          <div className="card mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Active Invites</h2>
            <div className="flex flex-col gap-2">
              {invites.filter((i: any) => !i.used_by).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-input-bg rounded-lg">
                  <code className="text-xs text-foreground">{inv.code}</code>
                  <button onClick={() => handleDeleteInvite(inv.id)} className="text-xs text-error hover:text-red">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User list */}
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <div key={u.id} className="card">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">{u.username}</span>
                    <p className="text-xs text-muted mt-1">Created by {u.created_by || 'system'}</p>
                  </div>
                  {currentUser && u.id !== currentUser.id && (
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="btn-outline border-error text-error hover:bg-error hover:text-white hover:border-error text-xs py-1.5 px-3"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
