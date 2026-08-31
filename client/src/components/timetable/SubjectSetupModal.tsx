import { useEffect, useMemo, useState } from "react";
import { X, BookMarked, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useClasses } from "../../context/ClassesContext";
import { api, ApiError } from "../../lib/api";
import type { ClassStage, Subject } from "../../lib/types";

type FlatLevel = { id: number; level: string; stage: string };

function flattenLevels(tree: ClassStage[]): FlatLevel[] {
  const seen = new Set<number>();
  const out: FlatLevel[] = [];
  for (const stage of tree) {
    for (const level of stage.levels) {
      if (seen.has(level.id)) continue;
      seen.add(level.id);
      out.push({ id: level.id, level: level.level, stage: stage.stage });
    }
  }
  return out;
}

const emptyForm = { name: "", color: "#6366f1", igSubject: false, weeklyPeriods: 0, price: 0, category: "" };

export default function SubjectSetupModal({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const { tree } = useClasses();
  const levels = useMemo(() => flattenLevels(tree), [tree]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [levelIds, setLevelIds] = useState<Set<number>>(new Set());

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getSubjects(token);
      setSubjects(res.subjects);
    } catch {
      setError("Could not load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setLevelIds(new Set());
  };

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      color: s.color ?? "#6366f1",
      igSubject: Boolean(s.ig_subject),
      weeklyPeriods: s.weekly_periods,
      price: s.price,
      category: s.category ?? "",
    });
    setLevelIds(new Set(s.level_ids));
  };

  const toggleLevel = (id: number) => {
    setLevelIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllLevels = () => {
    setLevelIds((prev) => (prev.size === levels.length ? new Set() : new Set(levels.map((l) => l.id))));
  };

  const save = async () => {
    if (!token || !form.name.trim()) return;
    setError(null);
    const body = {
      name: form.name.trim(),
      color: form.color,
      igSubject: form.igSubject,
      weeklyPeriods: Number(form.weeklyPeriods) || 0,
      price: Number(form.price) || 0,
      category: form.category.trim() || undefined,
      levelIds: [...levelIds],
    };
    try {
      if (editingId == null) {
        await api.createSubject(token, body);
      } else {
        await api.updateSubject(token, editingId, body);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Remove this subject?")) return;
    try {
      await api.deleteSubject(token, id);
      if (editingId === id) resetForm();
      await load();
    } catch {
      setError("Could not remove.");
    }
  };

  const levelName = (id: number) => levels.find((l) => l.id === id)?.level ?? "—";

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
      <div className="animate-rise-in flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-2">
            <BookMarked size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-slate-800">Subject Setup</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Section Count</label>
                  <input
                    type="number"
                    min={0}
                    value={form.weeklyPeriods}
                    onChange={(e) => setForm((f) => ({ ...f, weeklyPeriods: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Color</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Price</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.igSubject}
                    onChange={(e) => setForm((f) => ({ ...f, igSubject: e.target.checked }))}
                    className="h-4 w-4 accent-brand-600"
                  />
                  IG Subject
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-2">
              <label className="mb-1.5 flex items-center gap-2 border-b border-slate-100 px-1 pb-1.5 text-xs font-semibold text-slate-500">
                <input
                  type="checkbox"
                  checked={levels.length > 0 && levelIds.size === levels.length}
                  onChange={selectAllLevels}
                  className="h-3.5 w-3.5 accent-brand-600"
                />
                Section — Select All
              </label>
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {levels.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50" dir="rtl">
                    <input
                      type="checkbox"
                      checked={levelIds.has(l.id)}
                      onChange={() => toggleLevel(l.id)}
                      className="h-3.5 w-3.5 accent-brand-600"
                    />
                    {l.level}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            {editingId != null && (
              <button
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel edit
              </button>
            )}
            <button
              onClick={save}
              className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:-translate-y-0.5"
            >
              {editingId == null ? "Save" : "Update"}
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && subjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      No subjects yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  subjects.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: s.color ?? "#94a3b8" }} />
                        {s.name}
                      </td>
                      <td className="px-3 py-2 text-slate-500" dir="rtl">
                        {s.level_ids.length === 0
                          ? "—"
                          : s.level_ids.length === 1
                          ? levelName(s.level_ids[0])
                          : `${s.level_ids.length} sections`}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.price}</td>
                      <td className="px-3 py-2 text-slate-500">{s.category || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => remove(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
