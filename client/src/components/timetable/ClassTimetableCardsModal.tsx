import { useEffect, useMemo, useState } from "react";
import { X, CalendarDays, Search, Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useClasses } from "../../context/ClassesContext";
import { api } from "../../lib/api";
import type { ClassTimetableOverviewRow } from "../../lib/types";

type Card = { id: number; className: string; stage: string; level: string };

type Props = {
  onSelectClass: (classId: number) => void;
  onClose: () => void;
};

export default function ClassTimetableCardsModal({ onSelectClass, onClose }: Props) {
  const { token } = useAuth();
  const { tree } = useClasses();
  const [overview, setOverview] = useState<ClassTimetableOverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getClassTimetableOverview(token)
      .then((res) => setOverview(res.overview))
      .catch(() => setOverview([]))
      .finally(() => setLoading(false));
  }, [token]);

  const overviewByClass = useMemo(() => new Map(overview.map((o) => [o.classId, o])), [overview]);

  const cards = useMemo<Card[]>(
    () =>
      tree.flatMap((stage) =>
        stage.levels.flatMap((level) =>
          level.classes.map((c) => ({ id: c.id, className: c.className, stage: stage.stage, level: level.level }))
        )
      ),
    [tree]
  );

  const visible = cards.filter((c) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    return c.className.toLowerCase().includes(q) || c.stage.toLowerCase().includes(q) || c.level.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
      <div className="animate-rise-in flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-800">Time Tables</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search classes…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="py-6 text-center text-sm text-slate-400">Loading…</p>}
          {!loading && visible.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No classes found.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {visible.map((c) => {
              const stats = overviewByClass.get(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectClass(c.id)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{c.className}</span>
                    {stats?.posted && <Lock size={12} className="shrink-0 text-amber-500" />}
                  </div>
                  <span className="text-xs text-slate-400">
                    {c.stage} &middot; {c.level}
                  </span>
                  <span className="mt-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    {stats?.entryCount ?? 0} period{stats?.entryCount === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
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
