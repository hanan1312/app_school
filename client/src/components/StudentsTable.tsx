import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Pencil, Trash2, Settings2, Search, RotateCcw, X } from "lucide-react";
import type { Student } from "../lib/types";
import {
  STUDENT_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  loadVisibleColumns,
  saveVisibleColumns,
  genderBadgeClass,
  type StudentColumnKey,
} from "../lib/studentColumns";

const COLUMN_MAP = new Map(STUDENT_COLUMNS.map((c) => [c.key, c]));

const DATE_COLUMNS = new Set<StudentColumnKey>(["birthday", "admission_date", "status_date"]);
const RTL_COLUMNS = new Set<StudentColumnKey>([
  "name",
  "address",
  "division",
  "category",
  "father_name",
  "mother_name",
  "notes",
]);

function formatDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function cellText(colKey: StudentColumnKey, rawValue: string) {
  if (DATE_COLUMNS.has(colKey)) return formatDate(rawValue) || "—";
  return rawValue || "—";
}

type FilterOption = { value: string; count: number };

function ColumnFilterMenu({
  anchorRect,
  label,
  options,
  active,
  onChange,
  onClose,
}: {
  anchorRect: DOMRect;
  label: string;
  options: FilterOption[];
  active: Set<string> | null;
  onChange: (next: Set<string> | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const allValues = useMemo(() => options.map((o) => o.value), [options]);
  const selected = active ?? new Set(allValues);
  const visibleOptions = options.filter((o) => o.value.toLowerCase().includes(search.toLowerCase()));

  const toggleValue = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next.size >= allValues.length ? null : next);
  };

  const menuWidth = 240;
  const left = Math.min(anchorRect.left, Math.max(8, window.innerWidth - menuWidth - 8));
  const top = anchorRect.bottom + 4;

  return (
    <div
      data-col-filter-popover
      style={{ position: "fixed", top, left, width: menuWidth }}
      className="animate-scale-in z-50 origin-top-left rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
    >
      <p className="mb-1.5 truncate px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Filter: {label}
      </p>
      <div className="relative mb-2">
        <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search values…"
          className="w-full rounded-md border border-slate-200 py-1 pl-6 pr-2 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <div className="mb-1.5 flex items-center justify-between px-0.5 text-[11px] font-medium text-brand-600">
        <button type="button" onClick={() => onChange(null)} className="hover:underline">
          Select all
        </button>
        <button type="button" onClick={() => onChange(new Set())} className="hover:underline">
          Clear
        </button>
      </div>
      <div className="max-h-48 space-y-0.5 overflow-y-auto">
        {visibleOptions.length === 0 && <p className="px-1 py-2 text-center text-[11px] text-slate-400">No values</p>}
        {visibleOptions.map(({ value, count }) => (
          <label
            key={value || "(blank)"}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.has(value)}
              onChange={() => toggleValue(value)}
              className="h-3.5 w-3.5 accent-brand-600"
            />
            <span className="flex-1 truncate">{value || "(Blank)"}</span>
            <span className="text-[10px] text-slate-300">{count}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ManageColumnsModal({
  visible,
  onToggle,
  onClose,
  onReset,
}: {
  visible: Set<StudentColumnKey>;
  onToggle: (key: StudentColumnKey) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-rise-in flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Table Columns</h2>
            <p className="text-xs text-slate-400">Choose which student fields appear in the table.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {STUDENT_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/40"
              >
                <input
                  type="checkbox"
                  checked={visible.has(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="h-4 w-4 accent-brand-600"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            Reset to default
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-600/30 active:translate-y-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  students: Student[];
  loading: boolean;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
  onDeleteMany: (students: Student[]) => void;
};

export default function StudentsTable({ students, loading, onEdit, onDelete, onDeleteMany }: Props) {
  const [visibleKeys, setVisibleKeys] = useState<StudentColumnKey[]>(() => loadVisibleColumns());
  const [columnFilters, setColumnFilters] = useState<Partial<Record<StudentColumnKey, Set<string>>>>({});
  const [manageOpen, setManageOpen] = useState(false);
  const [openFilterKey, setOpenFilterKey] = useState<StudentColumnKey | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => saveVisibleColumns(visibleKeys), [visibleKeys]);

  useEffect(() => setSelectedIds(new Set()), [students]);

  useEffect(() => {
    if (!openFilterKey) return;
    const closeIfOutside = (e: MouseEvent | globalThis.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-col-filter-popover]") || target.closest("[data-col-filter-trigger]")) return;
      setOpenFilterKey(null);
    };
    const close = () => setOpenFilterKey(null);
    document.addEventListener("mousedown", closeIfOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openFilterKey]);

  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys]);
  const orderedVisible = useMemo(() => STUDENT_COLUMNS.filter((c) => visibleSet.has(c.key)), [visibleSet]);

  const filteredStudents = useMemo(() => {
    const activeFilters = Object.entries(columnFilters) as [StudentColumnKey, Set<string>][];
    if (activeFilters.length === 0) return students;
    return students.filter((s) =>
      activeFilters.every(([key, set]) => {
        const col = COLUMN_MAP.get(key);
        if (!col) return true;
        return set.has(col.get(s) || "(Blank)");
      })
    );
  }, [students, columnFilters]);

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));
  const someFilteredSelected = filteredStudents.some((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));

  const optionsFor = (key: StudentColumnKey): FilterOption[] => {
    const col = COLUMN_MAP.get(key);
    if (!col) return [];
    const otherFilters = Object.entries(columnFilters).filter(([k]) => k !== key) as [StudentColumnKey, Set<string>][];
    const scoped = otherFilters.length
      ? students.filter((s) =>
          otherFilters.every(([k, set]) => {
            const c = COLUMN_MAP.get(k);
            if (!c) return true;
            return set.has(c.get(s) || "(Blank)");
          })
        )
      : students;
    const counts = new Map<string, number>();
    for (const s of scoped) {
      const val = col.get(s) || "(Blank)";
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
  };

  const toggleColumn = (key: StudentColumnKey) => {
    setVisibleKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setColumnFilters((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleKeys(DEFAULT_VISIBLE_COLUMNS);
    setColumnFilters({});
  };

  const handleHeaderClick = (key: StudentColumnKey, e: MouseEvent<HTMLButtonElement>) => {
    if (openFilterKey === key) {
      setOpenFilterKey(null);
      return;
    }
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setOpenFilterKey(key);
  };

  const openMenuCol = openFilterKey ? COLUMN_MAP.get(openFilterKey) : null;
  const columnCount = orderedVisible.length + 3;

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-0.5 before:rounded-t-xl before:bg-gradient-to-r before:from-brand-500 before:via-brand-400 before:to-gold-400 before:opacity-70 before:content-['']">
      <div className="print-hidden flex items-center justify-between border-b border-slate-100 px-3 py-2">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-brand-700">{selectedIds.size} selected</span>
            <button
              onClick={() => onDeleteMany(selectedStudents)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={13} />
              Delete selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {Object.keys(columnFilters).length > 0
              ? `${filteredStudents.length} of ${students.length} shown`
              : `${students.length} student${students.length === 1 ? "" : "s"}`}
          </span>
        )}
        <button
          onClick={() => setManageOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
        >
          <Settings2 size={13} />
          Columns
        </button>
      </div>

      <div className="print-area overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                  }}
                  onChange={toggleSelectAll}
                  disabled={filteredStudents.length === 0}
                  className="h-3.5 w-3.5 accent-brand-600"
                  title="Select all"
                />
              </th>
              <th className="whitespace-nowrap px-3 py-2.5">No.</th>
              {orderedVisible.map((col) => {
                const hasFilter = Boolean(columnFilters[col.key]);
                return (
                  <th key={col.key} className="whitespace-nowrap px-3 py-2.5">
                    <button
                      type="button"
                      data-col-filter-trigger
                      onClick={(e) => handleHeaderClick(col.key, e)}
                      className={`-mx-1 flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-slate-100 ${
                        hasFilter ? "text-brand-700" : ""
                      }`}
                    >
                      {col.label}
                      <ChevronDown size={12} className={hasFilter ? "text-brand-600" : "text-slate-400"} />
                    </button>
                  </th>
                );
              })}
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={columnCount} className="px-3 py-10 text-center text-slate-400">
                  Loading students…
                </td>
              </tr>
            )}

            {!loading && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-3 py-10 text-center text-slate-400">
                  No students found.
                </td>
              </tr>
            )}

            {!loading &&
              filteredStudents.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50 ${selectedIds.has(s.id) ? "bg-brand-50/40" : ""}`}>
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelectOne(s.id)}
                      className="h-3.5 w-3.5 accent-brand-600"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{s.seq_no}</td>
                  {orderedVisible.map((col) => {
                    const raw = col.get(s);
                    if (col.key === "gender") {
                      return (
                        <td key={col.key} className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${genderBadgeClass(s.gender)}`}
                          >
                            {raw}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "address") {
                      return (
                        <td
                          key={col.key}
                          className="max-w-[180px] truncate px-3 py-2.5 text-slate-500"
                          dir="rtl"
                          title={raw}
                        >
                          {raw || "—"}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 text-slate-500 ${col.key === "name" ? "font-medium text-slate-800" : ""}`}
                        dir={RTL_COLUMNS.has(col.key) ? "rtl" : undefined}
                      >
                        {cellText(col.key, raw)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {openFilterKey &&
        openMenuCol &&
        anchorRect &&
        createPortal(
          <ColumnFilterMenu
            anchorRect={anchorRect}
            label={openMenuCol.label}
            options={optionsFor(openFilterKey)}
            active={columnFilters[openFilterKey] ?? null}
            onChange={(next) =>
              setColumnFilters((prev) => {
                const copy = { ...prev };
                if (next === null) delete copy[openFilterKey];
                else copy[openFilterKey] = next;
                return copy;
              })
            }
            onClose={() => setOpenFilterKey(null)}
          />,
          document.body
        )}

      {manageOpen && (
        <ManageColumnsModal
          visible={visibleSet}
          onToggle={toggleColumn}
          onClose={() => setManageOpen(false)}
          onReset={resetColumns}
        />
      )}
    </div>
  );
}
