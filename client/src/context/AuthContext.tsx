import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, setSessionExpiredHandler } from "../lib/api";
import type { User } from "../lib/types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  bootstrapping: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasModule: (key: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "eduapp.auth";

function loadStored(): { user: User | null; token: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return { user: parsed.user ?? null, token: parsed.token ?? null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadStored();
  const [user, setUser] = useState<User | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(Boolean(stored.token));
  const [error, setError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.token }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to reach the server";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    setSessionExpiredHandler(() => {
      logout();
      setError("Your session has expired. Please sign in again.");
    });
    return () => setSessionExpiredHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-validate the stored token against the server on load, rather than trusting it
  // blindly — this also picks up a role/permissions change made since the last login.
  useEffect(() => {
    if (!stored.token) return;
    api
      .getMe(stored.token)
      .then((res) => {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: stored.token }));
      })
      .catch(() => {
        // A 401 already triggers the sessionExpiredHandler above; other failures
        // (e.g. offline) just fall back to the locally-cached user for this session.
      })
      .finally(() => setBootstrapping(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasModule = (key: string) => user?.role === "admin" || Boolean(user?.modules?.includes(key));

  const value = useMemo(
    () => ({ user, token, loading, bootstrapping, error, login, logout, hasModule }),
    [user, token, loading, bootstrapping, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
