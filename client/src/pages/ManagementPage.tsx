import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Building2, Plus, Search, Pencil, Trash2, Upload, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { downloadExcel } from "../lib/excel";
import type { StaffMember, StaffMemberInput } from "../lib/types";
import StaffFormModal from "../components/StaffFormModal";
import CsvImportModal, { type ImportColumn } from "../components/CsvImportModal";

type OutletCtx = { notify: (label: string) => void };

const STAFF_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Name", required: true, example: "Laila Fathy" },
  { key: "position", label: "Position", example: "Math Teacher" },
  { key: "department", label: "Department", example: "Academics" },
  { key: "phone", label: "Phone", example: "01012345678" },
  { key: "email", label: "Email", example: "laila@example.com" },
  { key: "nationalId", label: "National ID" },
  { key: "hireDate", label: "Hire Date", example: "2024-09-01" },
  { key: "address", label: "Address" },
  { key: "notes", label: "Notes" },
];

function mapStaffImportRow(raw: Record<string, string>): { input?: StaffMemberInput; error?: string } {
  return {
    input: {
      name: raw.name,
      position: raw.position || undefined,
      department: raw.department || undefined,
      phone: raw.phone || undefined,
      email: raw.email || undefined,
      nationalId: raw.nationalId || undefined,
      hireDate: raw.hireDate || undefined,
      address: raw.address || undefined,
      notes: raw.notes || undefined,
    },
  };
}

export default function ManagementPage() {
  useOutletContext<OutletCtx>();
  const { token } = useAuth();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffMember | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getStaff(token, { q: debouncedQuery || undefined });
      setStaff(res.staff);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, debouncedQuery]);

  const handleCreate = async (input: StaffMemberInput) => {
    if (!token) return;
    await api.createStaff(token, input);
    setModalOpen(false);
    await load();
  };

  const handleUpdate = async (input: StaffMemberInput) => {
    if (!token || !editing) return;
    await api.updateStaff(token, editing.id, input);
    setEditing(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    await api.deleteStaff(token, pendingDelete.id);
    setPendingDelete(null);
    await load();
  };

  const handleExport = () => {
    const headers = ["Name", "Position", "Department", "Phone", "Email", "National ID", "Hire Date", "Address", "Notes"];
    const rows = staff.map((s) => ({
      Name: s.name,
      Position: s.position ?? "",
      Department: s.department ?? "",
      Phone: s.phone ?? "",
      Email: s.email ?? "",
      "National ID": s.national_id ?? "",
      "Hire Date": s.hire_date ?? "",
      Address: s.address ?? "",
      Notes: s.notes ?? "",
    }));
    downloadExcel("staff.xlsx", headers, rows);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center border-r border-slate-200 px-3 last:border-r-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModalOpen(true)}
              className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
            >
              <Plus size={18} />
              <span>New Staff</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
            >
              <Upload size={18} />
              <span>Import</span>
            </button>
            <button
              onClick={handleExport}
              className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Staff Directory</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Building2 size={15} className="text-brand-500" />
          <span className="font-medium text-slate-700">Staff</span>
          <span className="text-slate-300">&middot;</span>
          <span>
            {staff.length} member{staff.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        {errorMsg && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-0.5 before:bg-gradient-to-r before:from-brand-500 before:via-brand-400 before:to-gold-400 before:opacity-70 before:content-['']">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Position</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Hire date</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                    Loading staff…
                  </td>
                </tr>
              )}

              {!loading && staff.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                    No staff members yet.
                  </td>
                </tr>
              )}

              {!loading &&
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.position ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.department ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.phone ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.email ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.hire_date ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setPendingDelete(s)}
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
      </div>

      {modalOpen && <StaffFormModal onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}

      {editing && <StaffFormModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}

      {importOpen && token && (
        <CsvImportModal<StaffMemberInput>
          title="Import Staff"
          templateFilename="staff-template.csv"
          columns={STAFF_IMPORT_COLUMNS}
          mapRow={mapStaffImportRow}
          onImportRow={(input) => api.createStaff(token, input).then(() => {})}
          onClose={() => setImportOpen(false)}
          onFinished={load}
        />
      )}

      {pendingDelete && (
        <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">Remove staff member?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              This will permanently delete{" "}
              <span className="font-medium text-slate-700">{pendingDelete.name}</span> from the directory.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
