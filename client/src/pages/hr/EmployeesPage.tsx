import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { UserPlus, Table2, CalendarCheck, ClipboardList, Building2, Search, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSchools } from "../../context/SchoolsContext";
import { useHrEmployees } from "../../context/HrEmployeesContext";
import { useHrOrg, type HrOrgSelection } from "../../context/HrOrgContext";
import { api, ApiError } from "../../lib/api";
import type { HrEmployee, HrEmployeeInput } from "../../lib/types";
import RibbonGroup from "../../components/RibbonGroup";
import EmployeeFormModal from "../../components/hr/EmployeeFormModal";
import HrAttendanceModal from "../../components/hr/HrAttendanceModal";
import HrLeaveModal from "../../components/hr/HrLeaveModal";
import SchoolsSwitcherModal from "../../components/hr/SchoolsSwitcherModal";

type OutletCtx = { notify: (label: string) => void };

const UNSPECIFIED = "Unspecified";

function selectionLabel(selection: HrOrgSelection): string | null {
  if (selection.type === "all") return null;
  if (selection.type === "division") return selection.division;
  if (selection.type === "section") return `${selection.division} / ${selection.section}`;
  return `${selection.division} / ${selection.section} / ${selection.job}`;
}

function matchesSelection(e: HrEmployee, selection: HrOrgSelection): boolean {
  if (selection.type === "all") return true;
  if ((e.division || UNSPECIFIED) !== selection.division) return false;
  if (selection.type === "division") return true;
  if ((e.section || UNSPECIFIED) !== selection.section) return false;
  if (selection.type === "section") return true;
  return (e.job || UNSPECIFIED) === selection.job;
}

export default function EmployeesPage() {
  useOutletContext<OutletCtx>();
  const { token } = useAuth();
  const { schools, selectedSchool } = useSchools();
  const { employees, loading, refresh } = useHrEmployees();
  const { selection, setSelection } = useHrOrg();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HrEmployee | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const visibleEmployees = useMemo(() => {
    const scoped = employees.filter((e) => matchesSelection(e, selection));
    if (!debouncedQuery) return scoped;
    return scoped.filter(
      (e) =>
        e.name_ar.toLowerCase().includes(debouncedQuery) ||
        e.name_en?.toLowerCase().includes(debouncedQuery) ||
        e.id_number?.toLowerCase().includes(debouncedQuery) ||
        e.job?.toLowerCase().includes(debouncedQuery)
    );
  }, [employees, selection, debouncedQuery]);

  const scopeName = selectionLabel(selection);

  const handleCreate = async (input: HrEmployeeInput) => {
    if (!token) return;
    await api.createHrEmployee(token, input);
    setModalOpen(false);
    await refresh();
  };

  const handleUpdate = async (input: HrEmployeeInput) => {
    if (!token || !editing) return;
    await api.updateHrEmployee(token, editing.id, input);
    setEditing(null);
    await refresh();
  };

  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    setErrorMsg(null);
    try {
      await api.deleteHrEmployee(token, pendingDelete.id);
      setPendingDelete(null);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not delete this employee.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <RibbonGroup
          caption="Employees Management"
          buttons={[
            { label: "New Employee", icon: UserPlus, onClick: () => setModalOpen(true) },
            { label: "Employees", icon: Table2, onClick: () => refresh() },
          ]}
        />
        <RibbonGroup
          caption="Attendance Management"
          buttons={[{ label: "Attendance", icon: CalendarCheck, onClick: () => setAttendanceOpen(true) }]}
        />
        <RibbonGroup caption="Leaves" buttons={[{ label: "Leves Request", icon: ClipboardList, onClick: () => setLeaveOpen(true) }]} />
        <RibbonGroup caption="Multi Properties" buttons={[{ label: "Schools", icon: Building2, onClick: () => setSchoolsOpen(true) }]} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{selectedSchool?.name ?? "No school selected"}</span>
          {scopeName && (
            <>
              <span>/</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{scopeName}</span>
              <button onClick={() => setSelection({ type: "all" })} className="text-slate-400 hover:text-slate-600" title="Clear filter">
                <X size={14} />
              </button>
            </>
          )}
          <span className="text-slate-300">&middot;</span>
          <span>
            {visibleEmployees.length} employee{visibleEmployees.length === 1 ? "" : "s"}
          </span>
          {schools.length > 1 && (
            <button onClick={() => setSchoolsOpen(true)} className="text-xs text-brand-600 hover:underline">
              Switch school
            </button>
          )}
        </div>

        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter text to search…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        {errorMsg && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Gender</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Division</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">مرحلة</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleEmployees.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400">{e.id}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">{e.name_ar}</td>
                  <td className="px-3 py-2 text-slate-500">{e.gender}</td>
                  <td className="px-3 py-2 text-slate-500">{e.id_number ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.country ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.division ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.section ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.department ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{e.job ?? "—"}</td>
                  <td className="px-3 py-2 capitalize text-slate-500">{e.status ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(e)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setPendingDelete(e)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visibleEmployees.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && <EmployeeFormModal onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}
      {editing && <EmployeeFormModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}
      {attendanceOpen && <HrAttendanceModal onClose={() => setAttendanceOpen(false)} />}
      {leaveOpen && <HrLeaveModal employees={employees} onClose={() => setLeaveOpen(false)} />}
      {schoolsOpen && <SchoolsSwitcherModal onClose={() => setSchoolsOpen(false)} />}

      {pendingDelete && (
        <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">Remove employee?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              This will permanently delete <span className="font-medium text-slate-700">{pendingDelete.name_ar}</span>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button onClick={confirmDelete} className="rounded-lg bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
