import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, assetUrl } from "../lib/api";
import { applyThemePalette } from "../lib/themePalettes";
import BackgroundWatermark from "../components/BackgroundWatermark";

function LampIllustration() {
  return (
    <div className="relative h-56 w-56 shrink-0 select-none">
      <div className="animate-glow-pulse absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-gold-400/30 blur-3xl" />
      <svg viewBox="0 0 200 220" className="relative h-full w-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <ellipse cx="100" cy="205" rx="46" ry="8" fill="#000" opacity="0.25" />
        <rect x="96" y="90" width="8" height="100" rx="4" fill="url(#pole)" />
        <ellipse cx="100" cy="192" rx="34" ry="7" fill="url(#base)" />
        <path d="M55 90 L145 90 L128 30 A34 26 0 0 0 72 30 Z" fill="url(#shade)" />
        <ellipse cx="100" cy="90" rx="45" ry="7" fill="#1a1d26" opacity="0.6" />
        <defs>
          <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3d98b" />
            <stop offset="100%" stopColor="#d4a94a" />
          </linearGradient>
          <linearGradient id="pole" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a3f4d" />
            <stop offset="100%" stopColor="#232733" />
          </linearGradient>
          <radialGradient id="base" cx="0.3" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#3a3f4d" />
            <stop offset="100%" stopColor="#171a21" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { user, login, loading, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [branding, setBranding] = useState<{
    school_name?: string;
    logo_url?: string;
    background_url?: string;
    theme_palette?: string;
  }>({});

  useEffect(() => {
    api
      .getPublicSettings()
      .then((res) => setBranding(res.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    applyThemePalette(branding.theme_palette);
  }, [branding.theme_palette]);

  if (user) return <Navigate to="/" replace />;

  const schoolName = branding.school_name || "SchoolSuite";
  const logoUrl = assetUrl(branding.logo_url);
  const backgroundUrl = assetUrl(branding.background_url);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim() || !password) {
      setLocalError("Please enter both username and password.");
      return;
    }
    try {
      await login(username.trim(), password);
    } catch {
      // error surfaced via auth context
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 px-4 py-10">
      <BackgroundWatermark src={backgroundUrl} opacity={0.16} />
      <div className="animate-float-slow pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="animate-float-slower pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" />

      <div className="animate-rise-in relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-10 md:flex-row md:justify-center md:gap-16">
        <div className="hidden flex-col items-center gap-4 text-center md:flex">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-24 w-24 rounded-2xl object-cover shadow-lg shadow-black/40" />
          ) : (
            <LampIllustration />
          )}
          <div>
            <p className="text-lg font-semibold tracking-wide text-white/90">{schoolName}</p>
            <p className="mt-1 max-w-[220px] text-sm text-white/40">
              Classes, students and admissions — all in one place.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/60 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-7 text-center md:text-left">
            <h1 className="text-2xl font-semibold text-white">Welcome</h1>
            <p className="mt-1 text-sm text-white/40">Sign in to {schoolName} to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-11 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-white/40 hover:text-white/70"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {(localError || error) && (
              <p className="animate-fade-in rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {localError || error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="animate-gradient-pan w-full rounded-xl bg-gradient-to-r from-gold-400 via-gold-300 to-gold-600 bg-[length:200%_auto] px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-600/20 transition hover:scale-[1.01] hover:shadow-gold-500/30 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
