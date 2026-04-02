export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export interface UserInfo {
  id: number;
  username: string;
  must_change_password: boolean;
  role: string;
  language: string | null;
}

export function getUser(): UserInfo | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      username: payload.username,
      must_change_password: payload.must_change_password,
      role: payload.role || 'admin',
      language: payload.language || null,
    };
  } catch {
    return null;
  }
}
