import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  UserPlus,
  Table2,
  CalendarCheck,
  ClipboardList,
  Building2,
  Search,
  X,
  Upload,
  Download,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSchools } from "../../context/SchoolsContext";
import { useHrEmployees } from "../../context/HrEmployeesContext";
import { useHrOrg, type HrOrgSelection } from "../../context/HrOrgContext";
import { api, ApiError } from "../../lib/api";
import { downloadExcel } from "../../lib/excel";
import type { HrEmployee, HrEmployeeInput } from "../../lib/types";
import RibbonGroup from "../../components/RibbonGroup";
import EmployeeFormModal from "../../components/hr/EmployeeFormModal";
import HrEmployeeTable from "../../components/hr/HrEmployeeTable";
import HrAttendanceModal from "../../components/hr/HrAttendanceModal";
import HrLeaveModal from "../../components/hr/HrLeaveModal";
import SchoolsSwitcherModal from "../../components/hr/SchoolsSwitcherModal";
import CsvImportModal, { type ImportColumn } from "../../components/CsvImportModal";

const COLUMNS_STORAGE_KEY = "hr-employees-table-columns-v1";

type OutletCtx = { notify: (label: string) => void };

const UNSPECIFIED = "Unspecified";

const HR_EMPLOYEE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "nameAr", label: "Name (Ar)", required: true, example: "أحمد محمد علي" },
  { key: "nameEn", label: "Name (En)" },
  { key: "gender", label: "Gender", example: "M", aliases: ["Sex"] },
  { key: "idNumber", label: "ID Number", aliases: ["ID"] },
  { key: "tel1", label: "Tel 1" },
  { key: "tel2", label: "Tel 2" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "birthday", label: "Birthday", example: "1990-01-15" },
  { key: "division", label: "Division" },
  { key: "section", label: "Section" },
  { key: "department", label: "Department" },
  { key: "job", label: "مرحلة", aliases: ["Job"] },
  { key: "status", label: "Status" },
];

function mapEmployeeImportRow(
  raw: Record<string, string>
): { input?: Omit<HrEmployeeInput, "schoolId">; error?: string; warning?: string } {
  const genderRaw = raw.gender?.trim().toUpperCase();
  const gender: "M" | "F" = genderRaw === "F" || genderRaw === "FEMALE" ? "F" : "M";

  return {
    input: {
      nameAr: raw.nameAr,
      gender,
      nameEn: raw.nameEn || undefined,
      idNumber: raw.idNumber || undefined,
      tel1: raw.tel1 || undefined,
      tel2: raw.tel2 || undefined,
      email: raw.email || undefined,
      address: raw.address || undefined,
      birthday: raw.birthday || undefined,
      division: raw.division || undefined,
      section: raw.section || undefined,
      department: raw.department || undefined,
      job: raw.job || undefined,
      status: raw.status || undefined,
    },
    warning: !genderRaw ? "Gender not in file — imported as Male" : undefined,
  };
}

function selectionLabel(selection: HrOrgSelection): string | null {
  if (selection.type === "all") return null;
  if (selection.type === "division") return selection.division;
  if (selection.type === "section") return `${selection.division} / ${selection.section}`;
  return `${selection.division} / ${selection.section} / ${selection.job}`;
}

// "Year of contract"_"Year of birth"_"last 4 digits of ID" — a quick-reference code shown
// right after the employee index, blank pieces just collapse to "—" rather than the string "undefined".
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
  const [importOpen, setImportOpen] = useState(false);

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

  const handleExport = () => {
    const headers = [
      "Code",
      "Name (Ar)",
      "Name (En)",
      "Gender",
      "ID Number",
      "Tel 1",
      "Tel 2",
      "Email",
      "Country",
      "Division",
      "Section",
      "Department",
      "مرحلة",
      "Status",
    ];
    const rows = visibleEmployees.map((e) => ({
      Code: e.id,
      "Name (Ar)": e.name_ar,
      "Name (En)": e.name_en ?? "",
      Gender: e.gender,
      "ID Number": e.id_number ?? "",
      "Tel 1": e.tel1 ?? "",
      "Tel 2": e.tel2 ?? "",
      Email: e.email ?? "",
      Country: e.country ?? "",
      Division: e.division ?? "",
      Section: e.section ?? "",
      Department: e.department ?? "",
      مرحلة: e.job ?? "",
      Status: e.status ?? "",
    }));
    downloadExcel("employees.xlsx", headers, rows);
  };

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
            { label: "Import", icon: Upload, onClick: () => setImportOpen(true) },
            { label: "Export", icon: Download, onClick: handleExport },
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

        <HrEmployeeTable
          employees={visibleEmployees}
          onRowClick={setEditing}
          onDelete={setPendingDelete}
          storageKey={COLUMNS_STORAGE_KEY}
          emptyLabel={loading ? "Loading…" : "No employees yet."}
        />
      </div>

      {modalOpen && <EmployeeFormModal onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}
      {editing && <EmployeeFormModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}
      {attendanceOpen && <HrAttendanceModal onClose={() => setAttendanceOpen(false)} />}
      {leaveOpen && <HrLeaveModal employees={employees} onClose={() => setLeaveOpen(false)} />}
      {schoolsOpen && <SchoolsSwitcherModal onClose={() => setSchoolsOpen(false)} />}

      {importOpen && token && selectedSchool && (
        <CsvImportModal<Omit<HrEmployeeInput, "schoolId">>
          title="Import Employees"
          templateFilename="employees-template.csv"
          columns={HR_EMPLOYEE_IMPORT_COLUMNS}
          mapRow={mapEmployeeImportRow}
          onImportRow={(input) => api.createHrEmployee(token, { ...input, schoolId: selectedSchool.id }).then(() => {})}
          onClose={() => setImportOpen(false)}
          onFinished={() => refresh()}
        />
      )}

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
