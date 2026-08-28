import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ClassTree from "./ClassTree";
import { useSettings } from "../context/SettingsContext";
import { assetUrl } from "../lib/api";
import { MODULES } from "../lib/modules";
import BackgroundWatermark from "./BackgroundWatermark";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function StatusFooter({ userLabel, licenseTo, academicYear }: { userLabel: string; licenseTo: string; academicYear: string }) {
  const now = useClock();
  return (
    <footer className="relative z-10 flex items-center justify-between border-t border-slate-200 bg-white/95 px-4 py-1.5 text-[11px] text-slate-500 shadow-[0_-1px_6px_rgba(15,23,42,0.04)] backdrop-blur-sm">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
        Date: {now.toLocaleDateString()} &nbsp;|&nbsp; Time: {now.toLocaleTimeString()}
      </span>
      <span className="hidden sm:inline">
        License To: {licenseTo} &middot; {academicYear} &middot; v1.0.0
      </span>
      <span>
        User: <span className="font-medium text-slate-700">{userLabel}</span>
      </span>
    </footer>
  );
}

export default function DashboardLayout() {
  const { user, logout, hasModule } = useAuth();
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const [notice, setNotice] = useState<string | null>(null);

  const schoolName = settings.school_name || "SchoolSuite";
  const logoUrl = assetUrl(settings.logo_url);
  const backgroundUrl = assetUrl(settings.background_url);

  const notify = (label: string) => {
    setNotice(`You don't have access to "${label}". Ask an admin to grant it from Users.`);
    window.setTimeout(() => setNotice(null), 3200);
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-50">
      <BackgroundWatermark src={backgroundUrl} opacity={0.07} />

      <header className="relative z-10 flex items-center justify-between overflow-hidden border-b border-slate-200 bg-gradient-to-r from-ink-950 via-ink-900 to-brand-900 px-4 py-2.5 shadow-md">
        <div className="animate-float-slow pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={schoolName}
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/15 transition-transform hover:scale-105"
            />
          ) : (
            <div className="animate-gradient-pan flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-300 via-gold-500 to-gold-600 text-ink-950 shadow-md shadow-black/30 transition-transform hover:scale-105">
              <GraduationCap size={18} />
            </div>
          )}
          <span className="text-base font-semibold tracking-tight text-gold-300">{schoolName}</span>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white ring-2 ring-white/15">
              {user?.full_name?.slice(0, 1) ?? "?"}
            </div>
            <span className="hidden text-sm font-medium text-white sm:inline">{user?.full_name}</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Sign out of ${schoolName}?`)) logout();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:-translate-y-0.5 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 hover:shadow-sm active:translate-y-0"
          >
            <LogOut size={14} />
            Exit
          </button>
        </div>
      </header>

      <nav className="relative z-10 flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        {MODULES.map((m) => {
          const Icon = m.icon;
          if (!hasModule(m.key)) {
            return (
              <button
                key={m.key}
                onClick={() => notify(m.label)}
                title="You don't have access to this module"
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-100"
              >
                <Icon size={15} />
                {m.label}
              </button>
            );
          }
          return (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                `group relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/25"
                    : "text-slate-600 hover:-translate-y-0.5 hover:bg-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className="transition-transform group-hover:scale-110" />
                  {m.label}
                  {isActive && (
                    <span className="animate-underline-in absolute inset-x-2 -bottom-[7px] h-0.5 rounded-full bg-gold-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {notice && (
        <div className="animate-scale-in absolute right-4 top-16 z-20 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 shadow-lg shadow-amber-900/10">
          {notice}
        </div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/95 shadow-sm md:block">
          <ClassTree />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div key={pathname} className="animate-fade-in h-full">
            <Outlet context={{ notify }} />
          </div>
        </main>
      </div>

      <StatusFooter
        userLabel={user?.username ?? ""}
        licenseTo={settings.license_to || schoolName}
        academicYear={settings.academic_year || ""}
      />
    </div>
  );
}
