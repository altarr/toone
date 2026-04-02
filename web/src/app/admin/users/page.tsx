'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red/20 text-red',
  speaker: 'bg-green-500/20 text-green-400',
  translator: 'bg-blue-500/20 text-blue-400',
  panelist: 'bg-purple-500/20 text-purple-400',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('speaker');
  const [newLanguage, setNewLanguage] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit role
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editLanguage, setEditLanguage] = useState('');

  // Invite QR
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState('speaker');
  const [inviteLanguage, setInviteLanguage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const inviteCanvasRef = useRef<HTMLCanvasElement>(null);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!currentUser) { router.push('/admin/login'); return; }
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, settingsRes, invitesRes] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/settings/public'),
        isAdmin ? apiFetch('/api/invites') : Promise.resolve(null),
      ]);
      setUsers(await usersRes.json());
      const settings = await settingsRes.json();
      if (settings.languages) setLanguages(settings.languages);
      if (invitesRes) setInvites(await invitesRes.json());
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
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole, language: newRole === 'translator' ? newLanguage : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewUsername(''); setNewPassword(''); setNewRole('speaker'); setNewLanguage(''); setShowAdd(false);
      loadAll();
    } catch (err: any) { setError(err.message); }
    setAdding(false);
  };

  const handleUpdateRole = async (id: number) => {
    await apiFetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: editRole, language: editRole === 'translator' ? editLanguage : undefined }),
    });
    setEditingId(null);
    loadAll();
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const handleCreateInvite = async () => {
    const res = await apiFetch('/api/invites', {
      method: 'POST',
      body: JSON.stringify({ role: inviteRole, language: inviteRole === 'translator' ? inviteLanguage : undefined }),
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

        {isAdmin && (
          <div className="flex gap-3 mb-6">
            <button onClick={() => { setShowAdd(!showAdd); setShowInvite(false); }} className="btn-gradient">
              {showAdd ? 'Cancel' : 'Add User'}
            </button>
            <button onClick={() => { setShowInvite(!showInvite); setShowAdd(false); setInviteCode(''); }} className="btn-outline">
              {showInvite ? 'Cancel' : 'Invite via QR'}
            </button>
          </div>
        )}

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
              <div>
                <label className="field-label">Role</label>
                <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="speaker">Speaker</option>
                  <option value="translator">Translator</option>
                  <option value="panelist">Panelist</option>
                </select>
              </div>
              {newRole === 'translator' && (
                <div>
                  <label className="field-label">Language</label>
                  <select className="input" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)}>
                    <option value="">Select...</option>
                    {languages.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              )}
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="field-label">Role</label>
                    <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                      <option value="speaker">Speaker</option>
                      <option value="translator">Translator</option>
                      <option value="panelist">Panelist</option>
                    </select>
                  </div>
                  {inviteRole === 'translator' && (
                    <div>
                      <label className="field-label">Language</label>
                      <select className="input" value={inviteLanguage} onChange={(e) => setInviteLanguage(e.target.value)}>
                        <option value="">Select...</option>
                        {languages.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={handleCreateInvite} className="btn-gradient">Generate QR Code</button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted mb-3">
                  Scan this QR to register as <span className="text-foreground font-semibold">{inviteRole}</span>
                </p>
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
        {isAdmin && invites.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Active Invites</h2>
            <div className="flex flex-col gap-2">
              {invites.filter((i: any) => !i.used_by).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-input-bg rounded-lg">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-foreground">{inv.code}</code>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ROLE_COLORS[inv.role] || ''}`}>{inv.role}</span>
                    {inv.language && <span className="text-[10px] text-blue-400">{inv.language}</span>}
                  </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{u.username}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ROLE_COLORS[u.role] || 'bg-muted/20 text-muted'}`}>
                        {u.role || 'unknown'}
                      </span>
                      {u.language && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{u.language}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">Created by {u.created_by || 'system'}</p>
                  </div>
                  {isAdmin && currentUser && u.id !== currentUser.id && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditRole(u.role || 'admin'); setEditLanguage(u.language || ''); }}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        {editingId === u.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="btn-outline border-error text-error hover:bg-error hover:text-white hover:border-error text-xs py-1.5 px-3"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline role editor */}
                {editingId === u.id && (
                  <div className="mt-3 pt-3 border-t border-card-border flex items-end gap-3">
                    <div className="flex-1">
                      <label className="field-label">Role</label>
                      <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        <option value="admin">Admin</option>
                        <option value="speaker">Speaker</option>
                        <option value="translator">Translator</option>
                        <option value="panelist">Panelist</option>
                      </select>
                    </div>
                    {editRole === 'translator' && (
                      <div className="flex-1">
                        <label className="field-label">Language</label>
                        <select className="input" value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)}>
                          <option value="">Select...</option>
                          {languages.map((l: any) => <option key={l.code} value={l.code}>{l.name}</option>)}
                        </select>
                      </div>
                    )}
                    <button onClick={() => handleUpdateRole(u.id)} className="btn-gradient text-xs py-3 px-4">Save</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
