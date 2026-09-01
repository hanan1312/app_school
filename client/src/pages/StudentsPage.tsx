import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  UserPlus,
  Table2,
  FileBarChart,
  UserX,
  IdCard,
  Printer,
  ClipboardList,
  ClipboardCheck,
  CalendarCheck,
  BarChart3,
  Wallet,
  Search,
  Upload,
  Download,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useClasses, type ClassSelection } from "../context/ClassesContext";
import { api, ApiError } from "../lib/api";
import { downloadExcel } from "../lib/excel";
import { broadcastChange, useSyncListener } from "../lib/liveSync";
import { genderLabel } from "../lib/studentColumns";
import type { AdmissionInput, ClassStage, FeeType, PaymentInput, Student, StudentInput } from "../lib/types";
import StudentFormModal from "../components/StudentFormModal";
import StudentsTable from "../components/StudentsTable";
import StudentsReportModal from "../components/StudentsReportModal";
import StudentCardsModal from "../components/StudentCardsModal";
import AdmissionFormModal from "../components/AdmissionFormModal";
import PendingAdmissionsModal from "../components/PendingAdmissionsModal";
import AttendanceModal from "../components/AttendanceModal";
import AttendanceAnalysisModal from "../components/AttendanceAnalysisModal";
import NoShowModal from "../components/NoShowModal";
import PaymentFormModal from "../components/PaymentFormModal";
import StudentExpendItemsModal from "../components/StudentExpendItemsModal";
import CsvImportModal, { type ImportColumn } from "../components/CsvImportModal";
import RibbonGroup from "../components/RibbonGroup";

type FlatClass = { id: number; className: string; stage: string; level: string };

function flattenTree(tree: ClassStage[]): FlatClass[] {
  return tree.flatMap((stage) =>
    stage.levels.flatMap((level) =>
      level.classes.map((cls) => ({ id: cls.id, className: cls.className, stage: stage.stage, level: level.level }))
    )
  );
}

function selectionLabel(tree: ClassStage[], selection: ClassSelection): string | null {
  if (selection.type === "all") return null;
  if (selection.type === "stage") return selection.stage;
  if (selection.type === "level") return `${selection.stage} / ${selection.level}`;
  for (const stage of tree) {
    for (const level of stage.levels) {
      const found = level.classes.find((c) => c.id === selection.classId);
      if (found) return `${stage.stage} / ${level.level} / ${found.className}`;
    }
  }
  return null;
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return trimmed;
}

const STUDENT_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Name", required: true, example: "Ahmed Mostafa Hassan" },
  { key: "gender", label: "Gender", example: "M", aliases: ["Sex"] },
  { key: "className", label: "Class", example: "KG1 - A" },
  { key: "tel1", label: "Tel-1", example: "01012345678" },
  { key: "tel2", label: "Tel-2" },
  { key: "nationalId", label: "National ID", aliases: ["ID"] },
  { key: "moeCode", label: "MOE Code" },
  { key: "address", label: "Address" },
  { key: "birthday", label: "Birthday", example: "2020-01-15", aliases: ["Birthday Date"] },
  { key: "division", label: "Division" },
  { key: "section", label: "Section" },
  { key: "category", label: "Category", example: "خارجى", aliases: ["Catogry"] },
];

type OutletCtx = { notify: (label: string) => void };

export default function StudentsPage() {
  useOutletContext<OutletCtx>();
  const { token } = useAuth();
  const { tree, selection, setSelection, selectedClassIds, selectedClassId } = useClasses();
  const scopeName = selectionLabel(tree, selection);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [expendItemsStudent, setExpendItemsStudent] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [pendingAdmissionsOpen, setPendingAdmissionsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const loadStudents = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getStudents(token, {
        classIds: selectedClassIds ?? undefined,
        q: debouncedQuery || undefined,
      });
      setStudents(res.students);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedClassIds, debouncedQuery]);

  useSyncListener("students", loadStudents);

  useEffect(() => {
    if (!token) return;
    api
      .getFeeTypes(token)
      .then((res) => setFeeTypes(res.feeTypes))
      .catch(() => setFeeTypes([]));
  }, [token]);

  const handleCreate = async (input: StudentInput) => {
    if (!token) return;
    await api.createStudent(token, input);
    setModalOpen(false);
    await loadStudents();
    broadcastChange("students");
  };

  const handleUpdate = async (input: StudentInput) => {
    if (!token || !editing) return;
    await api.updateStudent(token, editing.id, input);
    setEditing(null);
    await loadStudents();
    broadcastChange("students");
  };

  const confirmDelete = async () => {
    if (!token || pendingDelete.length === 0) return;
    if (pendingDelete.length === 1) {
      await api.deleteStudent(token, pendingDelete[0].id);
    } else {
      await api.deleteStudents(token, pendingDelete.map((s) => s.id));
    }
    setPendingDelete([]);
    await loadStudents();
    broadcastChange("students");
  };

  const handleCreateAdmission = async (input: AdmissionInput) => {
    if (!token) return;
    await api.createAdmission(token, input);
    setAdmissionModalOpen(false);
  };

  const handleCreatePayment = async (input: PaymentInput) => {
    if (!token) return;
    await api.createPayment(token, input);
    setPaymentOpen(false);
  };

  const mapStudentImportRow = (raw: Record<string, string>): { input?: StudentInput; error?: string; warning?: string } => {
    const genderRaw = raw.gender?.trim().toUpperCase();
    const gender: "M" | "F" | "U" =
      genderRaw === "M" || genderRaw === "MALE" ? "M" : genderRaw === "F" || genderRaw === "FEMALE" ? "F" : "U";

    let classId: number | undefined;
    let division: string | undefined = raw.division?.trim() || undefined;
    let section: string | undefined = raw.section?.trim() || undefined;
    if (raw.className?.trim()) {
      const match = flattenTree(tree).find(
        (c) => c.className.trim().toLowerCase() === raw.className.trim().toLowerCase()
      );
      if (!match) return { error: `Unknown class "${raw.className}"` };
      classId = match.id;
      division = match.stage;
      section = match.level;
    }

    return {
      input: {
        name: raw.name,
        gender,
        classId,
        division,
        section,
        tel1: raw.tel1 || undefined,
        tel2: raw.tel2 || undefined,
        nationalId: raw.nationalId || undefined,
        moeCode: raw.moeCode || undefined,
        address: raw.address || undefined,
        birthday: toIsoDate(raw.birthday),
        category: raw.category || undefined,
      },
      warning: gender === "U" ? "Gender not in file — imported as Unknown" : undefined,
    };
  };

  const handleExport = () => {
    const headers = [
      "No.",
      "Gender",
      "Name",
      "Tel-1",
      "Tel-2",
      "ID",
      "MOE Code",
      "Address",
      "Birthday",
      "Division",
      "Section",
      "Category",
    ];
    const rows = students.map((s) => ({
      "No.": s.seq_no,
      Gender: genderLabel(s.gender),
      Name: s.name,
      "Tel-1": s.tel1 ?? "",
      "Tel-2": s.tel2 ?? "",
      ID: s.national_id ?? "",
      "MOE Code": s.moe_code ?? "",
      Address: s.address ?? "",
      Birthday: s.birthday ?? "",
      Division: s.division ?? "",
      Section: s.section ?? "",
      Category: s.category ?? "",
    }));
    downloadExcel("students.xlsx", headers, rows);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <RibbonGroup
          caption="Students"
          buttons={[
            { label: "New Student", icon: UserPlus, onClick: () => setModalOpen(true) },
            { label: "Import", icon: Upload, onClick: () => setImportOpen(true) },
            { label: "Export", icon: Download, onClick: handleExport },
            { label: "Students Data", icon: Table2, onClick: () => loadStudents() },
            { label: "Reports", icon: FileBarChart, onClick: () => setReportOpen(true) },
            { label: "No Show", icon: UserX, onClick: () => setNoShowOpen(true) },
          ]}
        />
        <RibbonGroup
          caption="Cards"
          buttons={[
            { label: "Cards", icon: IdCard, onClick: () => setCardsOpen(true) },
            { label: "Print", icon: Printer, onClick: () => window.print() },
          ]}
        />
        <RibbonGroup
          caption="Admissions"
          buttons={[
            { label: "New Admission", icon: ClipboardList, onClick: () => setModalOpen(true) },
            { label: "Pending", icon: ClipboardCheck, onClick: () => setPendingAdmissionsOpen(true) },
          ]}
        />
        <RibbonGroup
          caption="Attendance"
          buttons={[
            { label: "Attendance", icon: CalendarCheck, onClick: () => setAttendanceOpen(true) },
            { label: "Analysis", icon: BarChart3, onClick: () => setAnalysisOpen(true) },
          ]}
        />
        <RibbonGroup
          caption="Payment"
          buttons={[{ label: "Payment", icon: Wallet, onClick: () => setPaymentOpen(true) }]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">My School</span>
          {scopeName && (
            <>
              <span>/</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {scopeName}
              </span>
              <button
                onClick={() => setSelection({ type: "all" })}
                className="text-slate-400 hover:text-slate-600"
                title="Clear filter"
              >
                <X size={14} />
              </button>
            </>
          )}
          <span className="text-slate-300">&middot;</span>
          <span>{students.length} student{students.length === 1 ? "" : "s"}</span>
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

        <StudentsTable
          students={students}
          loading={loading}
          onEdit={setEditing}
          onDelete={(s) => setPendingDelete([s])}
          onDeleteMany={setPendingDelete}
          onRowClick={setExpendItemsStudent}
        />
      </div>

      {modalOpen && <StudentFormModal tree={tree} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}

      {editing && (
        <StudentFormModal tree={tree} initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />
      )}

      {expendItemsStudent && (
        <StudentExpendItemsModal student={expendItemsStudent} onClose={() => setExpendItemsStudent(null)} />
      )}

      {reportOpen && (
        <StudentsReportModal
          students={students}
          scopeLabel={scopeName ? `My School / ${scopeName}` : "My School (all classes)"}
          onClose={() => setReportOpen(false)}
        />
      )}

      {cardsOpen && <StudentCardsModal students={students} tree={tree} onClose={() => setCardsOpen(false)} />}

      {admissionModalOpen && (
        <AdmissionFormModal tree={tree} onClose={() => setAdmissionModalOpen(false)} onSubmit={handleCreateAdmission} />
      )}

      {pendingAdmissionsOpen && (
        <PendingAdmissionsModal
          tree={tree}
          onClose={() => setPendingAdmissionsOpen(false)}
          onApproved={() => {
            loadStudents();
            broadcastChange("students");
          }}
        />
      )}

      {attendanceOpen && (
        <AttendanceModal
          students={students}
          classId={selectedClassId}
          onClose={() => setAttendanceOpen(false)}
          onSaved={() => {}}
        />
      )}

      {analysisOpen && <AttendanceAnalysisModal classId={selectedClassId} onClose={() => setAnalysisOpen(false)} />}

      {noShowOpen && (
        <NoShowModal classId={selectedClassId} onClose={() => setNoShowOpen(false)} onMarked={() => {}} />
      )}

      {paymentOpen && (
        <PaymentFormModal feeTypes={feeTypes} onClose={() => setPaymentOpen(false)} onSubmit={handleCreatePayment} />
      )}

      {importOpen && token && (
        <CsvImportModal<StudentInput>
          title="Import Students"
          templateFilename="students-template.csv"
          columns={STUDENT_IMPORT_COLUMNS}
          mapRow={mapStudentImportRow}
          onImportRow={(input) => api.createStudent(token, input).then(() => {})}
          onClose={() => setImportOpen(false)}
          onFinished={() => {
            loadStudents();
            broadcastChange("students");
          }}
        />
      )}

      {pendingDelete.length > 0 && (
        <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">
              {pendingDelete.length === 1 ? "Remove student?" : `Remove ${pendingDelete.length} students?`}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              {pendingDelete.length === 1 ? (
                <>
                  This will permanently delete{" "}
                  <span className="font-medium text-slate-700">{pendingDelete[0].name}</span> from the roster.
                </>
              ) : (
                <>
                  This will permanently delete{" "}
                  <span className="font-medium text-slate-700">{pendingDelete.length} students</span> from the
                  roster. This can't be undone.
                </>
              )}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete([])}
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
