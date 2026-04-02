'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    apiFetch(`/api/invites/${code}/info`)
      .then(async (res) => {
        if (res.status === 410) { setExpired(true); return; }
        if (!res.ok) { setError('Invalid invite link'); return; }
        setInviteInfo(await res.json());
      })
      .catch(() => setError('Failed to load invite'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Username is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/invites/${code}/register`, {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-login after registration
      const loginRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.token) {
        setToken(loginData.token);
        router.push('/admin/broadcast');
      } else {
        router.push('/admin/login');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="card w-full max-w-sm text-center">
          <h1 className="text-lg font-bold uppercase tracking-wider mb-4">Invite Used</h1>
          <p className="text-sm text-muted mb-6">This invite has already been used. Contact an admin for a new invite.</p>
          <a href="/admin/login" className="btn-outline inline-block">Sign In</a>
        </div>
      </div>
    );
  }

  if (!inviteInfo) {
    return (
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="card w-full max-w-sm text-center">
          <h1 className="text-lg font-bold uppercase tracking-wider mb-4">Invalid Invite</h1>
          <p className="text-sm text-error">{error || 'This invite link is not valid.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <div className="card w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/logo-full-white.svg" alt="Toone" className="h-10" />
        </div>

        <h1 className="text-lg font-bold text-center uppercase tracking-wider mb-2">
          Create Account
        </h1>
        <p className="text-sm text-muted text-center mb-8">
          Create your account to get started.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="field-label">Confirm Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button type="submit" className="btn-gradient" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
