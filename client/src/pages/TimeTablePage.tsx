import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, Plus, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useClasses } from "../context/ClassesContext";
import { api, ApiError } from "../lib/api";
import type { TimetableEntry } from "../lib/types";
import TimetableEntryModal from "../components/TimetableEntryModal";

type OutletCtx = { notify: (label: string) => void };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimeTablePage() {
  useOutletContext<OutletCtx>();
  const { token } = useAuth();
  const { selectedClassId, selectedClassName } = useClasses();

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ day: number; period: number } | null>(null);

  const load = async () => {
    if (!token || !selectedClassId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getTimetable(token, selectedClassId);
      setEntries(res.entries);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not load the timetable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedClassId]);

  const entryFor = (day: number, period: number) =>
    entries.find((e) => e.day_of_week === day && e.period_no === period) ?? null;

  const handleSubmit = async (input: { subject: string; teacherName?: string; startTime?: string; endTime?: string }) => {
    if (!token || !selectedClassId || !activeCell) return;
    const existing = entryFor(activeCell.day, activeCell.period);
    if (existing) {
      await api.updateTimetableEntry(token, existing.id, input);
    } else {
      await api.createTimetableEntry(token, {
        classId: selectedClassId,
        dayOfWeek: activeCell.day,
        periodNo: activeCell.period,
        ...input,
      });
    }
    setActiveCell(null);
    await load();
  };

  const handleDelete = async () => {
    if (!token || !activeCell) return;
    const existing = entryFor(activeCell.day, activeCell.period);
    if (!existing) return;
    await api.deleteTimetableEntry(token, existing.id);
    setActiveCell(null);
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center border-r border-slate-200 px-3 last:border-r-0">
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-400">
              <CalendarDays size={18} />
              <span>Weekly Grid</span>
            </div>
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Time Table</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">My School</span>
          {selectedClassName && (
            <>
              <span>/</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {selectedClassName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        {errorMsg && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

        {!selectedClassId && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
            <CalendarDays size={32} />
            <p className="text-sm">Select a class from the sidebar to view or edit its timetable.</p>
          </div>
        )}

        {selectedClassId && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-0.5 before:bg-gradient-to-r before:from-brand-500 before:via-brand-400 before:to-gold-400 before:opacity-70 before:content-['']">
            <table className="min-w-full table-fixed divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-2 py-2.5 text-left">Period</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-2 py-2.5 text-left">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERIODS.map((period) => (
                  <tr key={period}>
                    <td className="px-2 py-2 text-center font-medium text-slate-500">{period}</td>
                    {DAYS.map((_, dayIdx) => {
                      const entry = entryFor(dayIdx, period);
                      return (
                        <td key={dayIdx} className="px-1.5 py-1.5 align-top">
                          {entry ? (
                            <button
                              onClick={() => setActiveCell({ day: dayIdx, period })}
                              className="group flex w-full flex-col items-start gap-0.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-2 text-left transition hover:border-brand-300"
                            >
                              <span className="flex w-full items-center justify-between text-xs font-semibold text-brand-800">
                                {entry.subject}
                                <Pencil size={12} className="text-brand-400 opacity-0 group-hover:opacity-100" />
                              </span>
                              {entry.teacher_name && <span className="text-[11px] text-brand-600">{entry.teacher_name}</span>}
                              {(entry.start_time || entry.end_time) && (
                                <span className="text-[10px] text-brand-400">
                                  {entry.start_time ?? ""}
                                  {entry.start_time && entry.end_time ? " – " : ""}
                                  {entry.end_time ?? ""}
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => setActiveCell({ day: dayIdx, period })}
                              className="flex h-14 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 transition hover:border-brand-300 hover:text-brand-400"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <p className="px-3 py-2 text-xs text-slate-400">Loading…</p>}
          </div>
        )}
      </div>

      {activeCell &&
        (() => {
          const existing = entryFor(activeCell.day, activeCell.period);
          return (
            <TimetableEntryModal
              dayLabel={DAYS[activeCell.day]}
              periodNo={activeCell.period}
              initial={existing}
              onClose={() => setActiveCell(null)}
              onSubmit={handleSubmit}
              onDelete={existing ? handleDelete : undefined}
            />
          );
        })()}
    </div>
  );
}
