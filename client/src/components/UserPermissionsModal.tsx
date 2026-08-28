import { useEffect, useState } from "react";
import { X, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { MODULES } from "../lib/modules";
import type { SystemUser } from "../lib/types";

type Props = {
  targetUser: SystemUser;
  onClose: () => void;
};

export default function UserPermissionsModal({ targetUser, onClose }: Props) {
  const { token } = useAuth();
  const isAdmin = targetUser.role === "admin";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getUserPermissions(token, targetUser.id)
      .then((res) => setSelected(new Set(res.modules)))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load permissions."))
      .finally(() => setLoading(false));
  }, [token, targetUser.id, isAdmin]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateUserPermissions(token, targetUser.id, [...selected]);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
      <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Manage access</h2>
            <p className="text-xs text-slate-400">{targetUser.full_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {isAdmin ? (
            <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-3 text-sm text-brand-700">
              <ShieldCheck size={18} className="shrink-0" />
              <span>Admins always have full access to every module.</span>
            </div>
          ) : loading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-1.5">
              {MODULES.map((m) => {
                const Icon = m.icon;
                const checked = selected.has(m.key);
                return (
                  <label
                    key={m.key}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
                      checked ? "border-brand-200 bg-brand-50/60 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.key)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <Icon size={15} className={checked ? "text-brand-600" : "text-slate-400"} />
                    {m.label}
                  </label>
                );
              })}
            </div>
          )}

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {isAdmin ? "Close" : "Cancel"}
          </button>
          {!isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/30 active:translate-y-0 disabled:opacity-60"
            >
              <KeyRound size={14} />
              {saving ? "Saving…" : "Save access"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
