import { useEffect, useState } from "react";
import { X, Clock3, Plus, Trash2, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError } from "../../lib/api";
import type { DailyPeriod } from "../../lib/types";

export default function DailyPeriodsModal({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const [periods, setPeriods] = useState<DailyPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getDailyPeriods(token);
      setPeriods(res.periods);
    } catch {
      setError("Could not load daily periods.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const update = async (id: number, field: "start_time" | "end_time", value: string) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const persist = async (id: number) => {
    if (!token) return;
    const period = periods.find((p) => p.id === id);
    if (!period) return;
    try {
      await api.updateDailyPeriod(token, id, { startTime: period.start_time, endTime: period.end_time });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const add = async () => {
    if (!token || !newStart || !newEnd) return;
    try {
      await api.createDailyPeriod(token, { startTime: newStart, endTime: newEnd });
      setNewStart("");
      setNewEnd("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add period.");
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Remove this period?")) return;
    try {
      await api.deleteDailyPeriod(token, id);
      await load();
    } catch {
      setError("Could not remove.");
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
      <div className="animate-rise-in w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-800">Daily Period</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-5 py-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-1.5">
              {periods.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <span className="w-6 text-xs font-medium text-slate-400">{p.period_no}</span>
                  <input
                    type="time"
                    value={p.start_time}
                    onChange={(e) => update(p.id, "start_time", e.target.value)}
                    onBlur={() => persist(p.id)}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                  />
                  <span className="text-slate-300">–</span>
                  <input
                    type="time"
                    value={p.end_time}
                    onChange={(e) => update(p.id, "end_time", e.target.value)}
                    onBlur={() => persist(p.id)}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
                  />
                  <button onClick={() => persist(p.id)} className="rounded-lg p-1 text-brand-600 hover:bg-brand-100">
                    <Check size={14} />
                  </button>
                  <button onClick={() => remove(p.id)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2">
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
            />
            <span className="text-slate-300">–</span>
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
            />
            <button onClick={add} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Add period">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
