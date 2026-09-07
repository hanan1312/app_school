import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Briefcase, BookOpen, Users, UserSquare2, Plus, Pencil, Trash2, Menu } from "lucide-react";
import type { HrEmployee, HrOrgDivision, HrOrgSection, Subject } from "../../lib/types";
import { useHrOrg, type HrOrgSelection } from "../../context/HrOrgContext";
import { useHrEmployees } from "../../context/HrEmployeesContext";
import { useSchools } from "../../context/SchoolsContext";
import { useClasses } from "../../context/ClassesContext";
import { AddInline, RenameInline, ConfirmDeleteDialog, RowActionButton } from "../TreeControls";
import { isHeadmasterDivisionName, isTeacherDivisionName, isPrincipalDivisionName, deriveEmployeeTitle } from "../../lib/hrEmployeeTitle";
import { useSubjects } from "../../lib/useSubjects";

// Mirrors EmployeeFormModal.tsx's synthetic "Staff" Division option — it isn't a real
// hr_org_divisions row unless a school happens to create one literally named "Staff", so the
// tree renders a non-editable stand-in for it below (see the root component) instead of relying
// on it showing up in `tree` like every other division does.
const STAFF_DIVISION = "Staff";

// Read-only listing of this division's employees, added underneath the existing add/rename/
// delete Section-Job tree rather than replacing it — that tree still drives the Position tab's
// Section picker for non-Teacher divisions, this block just answers "who is assigned here" at a
// glance. Headmaster is always a single fixed title ("Headmaster" — see EmployeeFormModal.tsx's
// deriveEmployeeTitle), which would just repeat the division's own label, so it renders as a
// flat list of names; every other division groups employees by their derived Title.
function DivisionEmployeeTitles({ employees, flat = false }: { employees: HrEmployee[]; flat?: boolean }) {
  if (employees.length === 0) return null;

  if (flat) {
    return (
      <div className="ml-3 border-l border-slate-200 pl-2">
        {employees.map((e) => (
          <div key={e.id} className="flex items-center gap-1.5 truncate px-2 py-1 text-slate-600" dir="rtl">
            <UserSquare2 size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{e.name_ar}</span>
          </div>
        ))}
      </div>
    );
  }

  const groups = new Map<string, HrEmployee[]>();
  for (const e of employees) {
    const key = e.title?.trim() || "Untitled";
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  return (
    <div className="ml-3 border-l border-slate-200 pl-2">
      {Array.from(groups.entries()).map(([titleLabel, group]) => (
        <div key={titleLabel} className="py-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-600">
            <UserSquare2 size={12} className="shrink-0 text-slate-400" />
            <span className="truncate font-medium" dir="rtl">
              {titleLabel}
            </span>
          </div>
          <div className="ml-4 border-l border-slate-100 pl-2">
            {group.map((e) => (
              <div key={e.id} className="truncate px-2 py-0.5 text-xs text-slate-500" dir="rtl">
                {e.name_ar}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The Teachers division's Position-tab picker sources "Section" from the Time Table > Subjects
// catalog rather than hr_org_sections (see EmployeeFormModal.tsx) — its hr_org_sections/jobs
// are vestigial there, so DivisionRow renders one of these per subject instead. Matches
// employees by subject_id (the real FK, set alongside the section-text mirror when a subject is
// picked) rather than comparing name text, so a subject rename can never break the grouping.
function TeacherSubjectRow({
  division,
  subject,
  employees,
  selection,
  onSelect,
}: {
  division: HrOrgDivision;
  subject: Subject;
  employees: HrEmployee[];
  selection: HrOrgSelection;
  onSelect: (selection: HrOrgSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const subjectEmployees = employees.filter(
    (e) => e.subject_id === subject.id && (e.division ?? "").trim() === division.division.trim()
  );
  const active = selection.type === "section" && selection.division === division.division && selection.section === subject.name;

  return (
    <div>
      <button
        onClick={() => {
          setOpen((o) => !o);
          onSelect({ type: "section", division: division.division, section: subject.name });
        }}
        className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 font-medium text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <BookOpen size={13} className={active ? "text-brand-600" : "text-slate-400"} />
        <span className="truncate" dir="rtl">
          {subject.name}
        </span>
      </button>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          <DivisionEmployeeTitles employees={subjectEmployees} />
        </div>
      )}
    </div>
  );
}

// The Principals/deputies division's Title is "<Division> <Department>" (see
// deriveEmployeeTitle) with no Section involved at all (its Section picker is hidden — see
// EmployeeFormModal.tsx), so — mirroring TeacherSubjectRow's use of the Subjects catalog — each
// possible Department (the Student's Affair Stage catalog) becomes a clickable sub-node here,
// pre-labeled with the exact Title an employee in that department would get. Matches by the
// employee's own stored Title text rather than recomputing per-employee, so a manually
// overridden Title (see EmployeeFormModal.tsx's editable Title field) still lands correctly.
function TitleSubdivisionRow({
  division,
  computedTitle,
  employees,
  selection,
  onSelect,
}: {
  division: HrOrgDivision;
  computedTitle: string;
  employees: HrEmployee[];
  selection: HrOrgSelection;
  onSelect: (selection: HrOrgSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const titleEmployees = employees.filter(
    (e) => (e.title ?? "").trim() === computedTitle.trim() && (e.division ?? "").trim() === division.division.trim()
  );
  const active = selection.type === "title" && selection.division === division.division && selection.title === computedTitle;

  return (
    <div>
      <button
        onClick={() => {
          setOpen((o) => !o);
          onSelect({ type: "title", division: division.division, title: computedTitle });
        }}
        className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 font-medium text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <UserSquare2 size={13} className={active ? "text-brand-600" : "text-slate-400"} />
        <span className="truncate" dir="rtl">
          {computedTitle}
        </span>
      </button>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          <DivisionEmployeeTitles employees={titleEmployees} flat />
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  job: string;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <RenameInline
        initialValue={job}
        onSave={async (name) => {
          await onRename(name);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="group flex items-center rounded-md">
      <button
        onClick={onSelect}
        className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition ${
          active
            ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/30"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <UserSquare2 size={13} className={active ? "text-white" : "text-slate-400"} />
        <span className="truncate" dir="rtl">
          {job}
        </span>
      </button>
      <RowActionButton
        title="Rename job"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <Pencil size={12} />
      </RowActionButton>
      <RowActionButton
        title="Delete job"
        variant="danger"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmingDelete(true);
        }}
      >
        <Trash2 size={12} />
      </RowActionButton>

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title="Delete job?"
          message={`"${job}" will be removed from the tree. Employees already using it keep their current value.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function SectionRow({
  division,
  section,
  selection,
  onSelect,
}: {
  division: HrOrgDivision;
  section: HrOrgSection;
  selection: HrOrgSelection;
  onSelect: (selection: HrOrgSelection) => void;
}) {
  const { createJob, renameSection, deleteSection, renameJob, deleteJob } = useHrOrg();
  const { refresh: refreshEmployees } = useHrEmployees();
  const [open, setOpen] = useState(true);
  const [addingJob, setAddingJob] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = selection.type === "section" && selection.division === division.division && selection.section === section.section;

  if (editing) {
    return (
      <RenameInline
        initialValue={section.section}
        onSave={async (name) => {
          // A renamed Section/Job's text is mirrored onto matching hr_employees rows
          // server-side (see hrOrg.ts) — refresh the already-loaded employees list so the
          // sidebar's Title grouping and the Employees table pick up the new text right away.
          await renameSection(section.id, name);
          await refreshEmployees();
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <div
        className={`group flex items-center rounded-md transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 shadow-sm" : "hover:bg-slate-100"
        }`}
      >
        <button
          onClick={() => {
            setOpen((o) => !o);
            onSelect({ type: "section", division: division.division, section: section.section });
          }}
          className={`flex flex-1 items-center gap-1 px-2 py-1.5 text-left ${
            active ? "font-medium text-brand-700" : "text-slate-600"
          }`}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Briefcase size={13} className={active ? "text-brand-600" : "text-slate-400"} />
          <span className="truncate" dir="rtl">
            {section.section}
          </span>
        </button>
        <RowActionButton
          title={`Add job in ${section.section}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
            setAddingJob(true);
          }}
        >
          <Plus size={13} />
        </RowActionButton>
        <RowActionButton
          title="Rename section"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil size={12} />
        </RowActionButton>
        <RowActionButton
          title="Delete section"
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
        >
          <Trash2 size={12} />
        </RowActionButton>
      </div>

      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {section.jobs.map((j) => (
            <JobRow
              key={j.id}
              job={j.job}
              active={
                selection.type === "job" &&
                selection.division === division.division &&
                selection.section === section.section &&
                selection.job === j.job
              }
              onSelect={() => onSelect({ type: "job", division: division.division, section: section.section, job: j.job })}
              onRename={async (name) => {
                await renameJob(j.id, name);
                await refreshEmployees();
              }}
              onDelete={() => deleteJob(j.id)}
            />
          ))}
          {addingJob && (
            <AddInline
              placeholder="New job name"
              onAdd={(name) => createJob(section.id, name)}
              onDone={() => setAddingJob(false)}
            />
          )}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title="Delete section?"
          message={`"${section.section}" and all its jobs will be removed from the tree. Employees already using them keep their current values.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => deleteSection(section.id)}
        />
      )}
    </div>
  );
}

function DivisionRow({
  division,
  employees,
  subjects,
  selection,
  onSelect,
}: {
  division: HrOrgDivision;
  employees: HrEmployee[];
  subjects: Subject[];
  selection: HrOrgSelection;
  onSelect: (selection: HrOrgSelection) => void;
}) {
  const { createSection, renameDivision, deleteDivision } = useHrOrg();
  const { refresh: refreshEmployees } = useHrEmployees();
  const [open, setOpen] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = selection.type === "division" && selection.division === division.division;
  const isTeacherDiv = isTeacherDivisionName(division.division);
  const isPrincipalDiv = isPrincipalDivisionName(division.division);
  const { tree: classTree } = useClasses();

  if (editing) {
    return (
      <div className="ml-2">
        <RenameInline
          initialValue={division.division}
          onSave={async (name) => {
            // A renamed Division's text (and, where it changes the formula's result, each
            // affected employee's derived Title) is synced server-side onto matching
            // hr_employees rows (see hrOrg.ts) — refresh the already-loaded employees list so
            // this tree and the Employees table reflect it immediately, not after a reload.
            await renameDivision(division.id, name);
            await refreshEmployees();
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="ml-2">
      <div
        className={`group flex items-center rounded-md transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 shadow-sm" : "hover:bg-slate-100"
        }`}
      >
        <button
          onClick={() => {
            setOpen((o) => !o);
            onSelect({ type: "division", division: division.division });
          }}
          className={`flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left font-medium ${
            active ? "text-brand-700" : "text-slate-700"
          }`}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} className={active ? "text-brand-600" : "text-slate-400"} />
          <span className="truncate" dir="rtl">
            {division.division}
          </span>
        </button>
        {!isTeacherDiv && !isPrincipalDiv && (
          <RowActionButton
            title={`Add section in ${division.division}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
              setAddingSection(true);
            }}
          >
            <Plus size={13} />
          </RowActionButton>
        )}
        <RowActionButton
          title="Rename division"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil size={12} />
        </RowActionButton>
        <RowActionButton
          title="Delete division"
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
          }}
        >
          <Trash2 size={12} />
        </RowActionButton>
      </div>

      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {isTeacherDiv ? (
            subjects.map((s) => (
              <TeacherSubjectRow key={s.id} division={division} subject={s} employees={employees} selection={selection} onSelect={onSelect} />
            ))
          ) : isPrincipalDiv ? (
            (() => {
              const departmentTitles = classTree.map((stage) => deriveEmployeeTitle(division.division, "", stage.stage));
              const departmentTitleSet = new Set(departmentTitles.map((t) => t.trim()));
              return (
                <>
                  {classTree.map((stage, i) => (
                    <TitleSubdivisionRow
                      key={stage.id}
                      division={division}
                      computedTitle={departmentTitles[i]}
                      employees={employees}
                      selection={selection}
                      onSelect={onSelect}
                    />
                  ))}
                  {/* Catches anyone with no Department set, or a manually-overridden Title
                      that doesn't match any Department-derived one above. */}
                  <DivisionEmployeeTitles
                    employees={employees.filter(
                      (e) =>
                        (e.division ?? "").trim() === division.division.trim() &&
                        !departmentTitleSet.has((e.title ?? "").trim())
                    )}
                  />
                </>
              );
            })()
          ) : (
            <>
              {division.sections.map((s) => (
                <SectionRow key={s.id} division={division} section={s} selection={selection} onSelect={onSelect} />
              ))}
              {addingSection && (
                <AddInline
                  placeholder="New section name"
                  onAdd={(name) => createSection(division.id, name)}
                  onDone={() => setAddingSection(false)}
                />
              )}
              <DivisionEmployeeTitles
                employees={employees.filter((e) => (e.division ?? "").trim() === division.division.trim())}
                flat={isHeadmasterDivisionName(division.division)}
              />
            </>
          )}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title="Delete division?"
          message={`"${division.division}" and everything inside it (sections and jobs) will be removed from the tree. Employees already using them keep their current values.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => deleteDivision(division.id)}
        />
      )}
    </div>
  );
}

// Stand-in for DivisionRow when no real "Staff" org division exists yet — same look, but no
// add-section/rename/delete affordances since there's no hr_org_divisions row backing it.
function SyntheticStaffDivision({ employees, selection, onSelect }: { employees: HrEmployee[]; selection: HrOrgSelection; onSelect: (selection: HrOrgSelection) => void }) {
  const [open, setOpen] = useState(true);
  const active = selection.type === "division" && selection.division === STAFF_DIVISION;

  return (
    <div className="ml-2">
      <div
        className={`group flex items-center rounded-md transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 shadow-sm" : "hover:bg-slate-100"
        }`}
      >
        <button
          onClick={() => {
            setOpen((o) => !o);
            onSelect({ type: "division", division: STAFF_DIVISION });
          }}
          className={`flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left font-medium ${
            active ? "text-brand-700" : "text-slate-700"
          }`}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} className={active ? "text-brand-600" : "text-slate-400"} />
          <span className="truncate">{STAFF_DIVISION}</span>
        </button>
      </div>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          <DivisionEmployeeTitles employees={employees} />
        </div>
      )}
    </div>
  );
}

export default function HrEmployeeTree({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { tree, selection, setSelection, createDivision } = useHrOrg();
  const { employees } = useHrEmployees();
  const subjects = useSubjects();
  const { selectedSchool } = useSchools();
  const [addingDivision, setAddingDivision] = useState(false);
  const hasStaffDivision = tree.some((d) => d.division.trim() === STAFF_DIVISION);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          <Building2 size={11} />
        </span>
        {!collapsed && <span className="flex-1 truncate">Employees</span>}
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          className="ml-auto shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
        >
          <Menu size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-1.5 py-2 text-sm">
          <div className="group mb-1 flex items-center rounded-md">
            <button
              onClick={() => setSelection({ type: "all" })}
              className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-medium transition ${
                selection.type === "all"
                  ? "bg-gradient-to-r from-brand-50 to-brand-100/60 text-brand-700 shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Building2 size={15} className="text-brand-600" />
              <span className="truncate">{selectedSchool?.name ?? "My School"}</span>
            </button>
            <button
              type="button"
              onClick={() => setAddingDivision(true)}
              title="Add division"
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
            >
              <Plus size={14} />
            </button>
          </div>

          {addingDivision && (
            <AddInline placeholder="New division name" onAdd={createDivision} onDone={() => setAddingDivision(false)} />
          )}

          {tree.map((division) => (
            <DivisionRow
              key={division.id}
              division={division}
              employees={employees}
              subjects={subjects}
              selection={selection}
              onSelect={setSelection}
            />
          ))}
          {!hasStaffDivision && (
            <SyntheticStaffDivision
              employees={employees.filter((e) => (e.division ?? "").trim() === STAFF_DIVISION)}
              selection={selection}
              onSelect={setSelection}
            />
          )}
        </div>
      )}
    </div>
  );
}
