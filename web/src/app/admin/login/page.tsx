'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [userRole, setUserRole] = useState('admin');

  function redirectByRole(role: string) {
    if (role === 'admin') router.push('/admin');
    else router.push('/admin/broadcast');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUserRole(data.user.role || 'admin');

      if (data.user.must_change_password) {
        setTempToken(data.token);
        setMustChangePassword(true);
      } else {
        setToken(data.token);
        redirectByRole(data.user.role || 'admin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setToken(data.token);
      redirectByRole(userRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-5">
      <div className="card w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-10" />
        </div>

        {!mustChangePassword ? (
          <>
            <h1 className="text-lg font-bold text-center tracking-wider uppercase text-foreground mb-8">
              Sign In
            </h1>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Username</label>
                <input
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
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
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-error text-sm">{error}</p>}
              <button type="submit" className="btn-gradient" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-center tracking-wider uppercase text-foreground mb-2">
              Change Password
            </h1>
            <p className="text-sm text-muted text-center mb-8">
              You must change your password before continuing.
            </p>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="field-label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <button type="submit" className="btn-gradient" disabled={loading}>
                {loading ? 'Saving...' : 'Set Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
