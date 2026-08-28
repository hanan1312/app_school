import { useEffect, useState } from "react";
import { Circle, History } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { ActivityLogEntry, PresenceEntry } from "../lib/types";

const REFRESH_MS = 15_000;

const STATUS_STYLES: Record<PresenceEntry["status"], string> = {
  online: "bg-green-50 text-green-700",
  idle: "bg-amber-50 text-amber-700",
  offline: "bg-slate-100 text-slate-500",
};

const STATUS_DOT: Record<PresenceEntry["status"], string> = {
  online: "text-green-500",
  idle: "text-amber-500",
  offline: "text-slate-300",
};

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const panelClass =
  "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-0.5 before:bg-gradient-to-r before:from-brand-500 before:via-brand-400 before:to-gold-400 before:opacity-70 before:content-['']";

export default function ActivityMonitor({ token }: { token: string }) {
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [presenceRes, activityRes] = await Promise.all([api.getPresence(token), api.getActivity(token)]);
        if (cancelled) return;
        setPresence(presenceRes.presence);
        setActivity(activityRes.activity);
        setErrorMsg(null);
      } catch (err) {
        if (!cancelled) setErrorMsg(err instanceof ApiError ? err.message : "Could not load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

      <div className={panelClass}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
          <Circle size={12} className="text-green-500" fill="currentColor" />
          Who&apos;s online
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Logged in</th>
                <th className="px-3 py-2.5">Session</th>
                <th className="px-3 py-2.5">Idle time</th>
                <th className="px-3 py-2.5">Went offline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && presence.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                    No sessions recorded yet.
                  </td>
                </tr>
              )}
              {!loading &&
                presence.map((p) => (
                  <tr key={p.username} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Circle size={9} className={STATUS_DOT[p.status]} fill="currentColor" />
                        {p.fullName} <span className="text-slate-400">@{p.username}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-slate-500">{p.role}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{new Date(p.loginAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDuration(p.sessionSeconds)}</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDuration(p.idleSeconds)}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {p.offlineAt ? new Date(p.offlineAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
          <History size={15} className="text-brand-500" />
          Recent activity
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Time</th>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && activity.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
              {!loading &&
                activity.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {a.full_name || a.username} <span className="text-slate-400">@{a.username}</span>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-slate-500">{a.role}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      <span className="mr-1.5 font-mono text-xs uppercase text-slate-400">{a.method}</span>
                      {a.module ?? a.path}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status_code < 400 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {a.status_code}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
