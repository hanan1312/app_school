import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Briefcase, Users, UserSquare2 } from "lucide-react";
import { useHrEmployees, type HrTreeDivisionNode, type HrTreeSectionNode, type HrTreeSelection } from "../../context/HrEmployeesContext";
import { useSchools } from "../../context/SchoolsContext";

function isActive(selection: HrTreeSelection, target: HrTreeSelection): boolean {
  if (target.type === "division") return selection.type === "division" && selection.division === target.division;
  if (target.type === "section")
    return selection.type === "section" && selection.division === target.division && selection.section === target.section;
  return (
    selection.type === "job" &&
    selection.division === target.division &&
    selection.section === target.section &&
    selection.job === target.job
  );
}

function JobRow({
  division,
  section,
  job,
  count,
  selection,
  onSelect,
}: {
  division: string;
  section: string;
  job: string;
  count: number;
  selection: HrTreeSelection;
  onSelect: (s: HrTreeSelection) => void;
}) {
  const active = isActive(selection, { type: "job", division, section, job });
  return (
    <button
      onClick={() => onSelect({ type: "job", division, section, job })}
      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition ${
        active
          ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/30"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <UserSquare2 size={13} className={active ? "text-white" : "text-slate-400"} />
      <span className="truncate">{job}</span>
      <span className={`ml-auto text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

function SectionRow({
  division,
  node,
  selection,
  onSelect,
}: {
  division: string;
  node: HrTreeSectionNode;
  selection: HrTreeSelection;
  onSelect: (s: HrTreeSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = isActive(selection, { type: "section", division, section: node.section });

  return (
    <div>
      <div
        className={`flex items-center rounded-md transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 shadow-sm" : "hover:bg-slate-100"
        }`}
      >
        <button
          onClick={() => {
            setOpen((o) => !o);
            onSelect({ type: "section", division, section: node.section });
          }}
          className={`flex flex-1 items-center gap-1 px-2 py-1.5 text-left ${active ? "font-medium text-brand-700" : "text-slate-600"}`}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Briefcase size={13} className={active ? "text-brand-600" : "text-slate-400"} />
          <span className="truncate">{node.section}</span>
          <span className="ml-auto text-[10px] text-slate-400">{node.count}</span>
        </button>
      </div>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {node.jobs.map((j) => (
            <JobRow
              key={j.job}
              division={division}
              section={node.section}
              job={j.job}
              count={j.count}
              selection={selection}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DivisionRow({
  node,
  selection,
  onSelect,
}: {
  node: HrTreeDivisionNode;
  selection: HrTreeSelection;
  onSelect: (s: HrTreeSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = isActive(selection, { type: "division", division: node.division });

  return (
    <div>
      <div
        className={`flex items-center rounded-md transition ${
          active ? "bg-gradient-to-r from-brand-50 to-brand-100/60 shadow-sm" : "hover:bg-slate-100"
        }`}
      >
        <button
          onClick={() => {
            setOpen((o) => !o);
            onSelect({ type: "division", division: node.division });
          }}
          className={`flex flex-1 items-center gap-1.5 px-2 py-1.5 text-left font-medium ${
            active ? "text-brand-700" : "text-slate-700"
          }`}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} className={active ? "text-brand-600" : "text-slate-400"} />
          <span className="truncate">{node.division}</span>
          <span className="ml-auto text-[10px] text-slate-400">{node.count}</span>
        </button>
      </div>
      {open && (
        <div className="ml-3 border-l border-slate-200 pl-2">
          {node.sections.map((s) => (
            <SectionRow key={s.section} division={node.division} node={s} selection={selection} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HrEmployeeTree() {
  const { tree, selection, setSelection } = useHrEmployees();
  const { selectedSchool } = useSchools();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          <Building2 size={11} />
        </span>
        Employees
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2 text-sm">
        <button
          onClick={() => setSelection({ type: "all" })}
          className={`mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-medium transition ${
            selection.type === "all"
              ? "bg-gradient-to-r from-brand-50 to-brand-100/60 text-brand-700 shadow-sm"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Building2 size={15} className="text-brand-600" />
          <span className="truncate">{selectedSchool?.name ?? "My School"}</span>
        </button>

        {tree.map((d) => (
          <DivisionRow key={d.division} node={d} selection={selection} onSelect={setSelection} />
        ))}
      </div>
    </div>
  );
}
