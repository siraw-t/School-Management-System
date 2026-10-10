import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'edupanel_session';

/* Decode JWT payload without a library */
function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/* Read session from either storage. Returns {token, user} or null. */
function readSession() {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;

    const payload = decodeJWT(parsed.token);
    if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const user = session?.user || null;

  const login = (data, remember = false) => {
    const s = { token: data.token, user: data.user };
    // Always clear first — no stale duplicates across storages
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);

    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    }
    setSession(s);
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, token: session?.token || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}