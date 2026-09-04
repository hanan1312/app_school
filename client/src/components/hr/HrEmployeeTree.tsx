import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Briefcase, Users, UserSquare2, Plus, Pencil, Trash2, Menu } from "lucide-react";
import type { HrOrgDivision, HrOrgSection } from "../../lib/types";
import { useHrOrg, type HrOrgSelection } from "../../context/HrOrgContext";
import { useSchools } from "../../context/SchoolsContext";
import { AddInline, RenameInline, ConfirmDeleteDialog, RowActionButton } from "../TreeControls";

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
          await renameSection(section.id, name);
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
              onRename={(name) => renameJob(j.id, name)}
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
  selection,
  onSelect,
}: {
  division: HrOrgDivision;
  selection: HrOrgSelection;
  onSelect: (selection: HrOrgSelection) => void;
}) {
  const { createSection, renameDivision, deleteDivision } = useHrOrg();
  const [open, setOpen] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = selection.type === "division" && selection.division === division.division;

  if (editing) {
    return (
      <div className="ml-2">
        <RenameInline
          initialValue={division.division}
          onSave={async (name) => {
            await renameDivision(division.id, name);
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

export default function HrEmployeeTree({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { tree, selection, setSelection, createDivision } = useHrOrg();
  const { selectedSchool } = useSchools();
  const [addingDivision, setAddingDivision] = useState(false);

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
            <DivisionRow key={division.id} division={division} selection={selection} onSelect={setSelection} />
          ))}
        </div>
      )}
    </div>
  );
}
