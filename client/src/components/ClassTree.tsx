import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronRight, School, Layers, Users, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { ClassLevel, ClassStage } from "../lib/types";
import { useClasses, type ClassSelection } from "../context/ClassesContext";

function AddInline({
  placeholder,
  onAdd,
  onDone,
}: {
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    const name = value.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(name);
      setValue("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      onDone();
    }
  };

  return (
    <div className="flex flex-col gap-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={submitting}
          dir="auto"
          className="w-full min-w-0 rounded-md border border-brand-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          title="Add"
          className="shrink-0 rounded-md bg-brand-600 p-1 text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          <Check size={12} />
        </button>
        <button
          type="button"
          onClick={onDone}
          title="Done"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={12} />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function RenameInline({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async () => {
    const name = value.trim();
    if (!name || name === initialValue) {
      onCancel();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename.");
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-1 px-2 py-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          dir="auto"
          className="w-full min-w-0 rounded-md border border-brand-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          title="Save"
          className="shrink-0 rounded-md bg-brand-600 p-1 text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          <Check size={12} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          title="Cancel"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={12} />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function ConfirmDeleteDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-500">{message}</p>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function RowActionButton({
  onClick,
  title,
  variant = "default",
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-slate-100 group-hover:opacity-100 ${
        variant === "danger" ? "hover:text-red-600" : "hover:bg-brand-50 hover:text-brand-600"
      }`}
    >
      {children}
    </button>
  );
}

function ClassRow({
  className,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  className: string;
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
        initialValue={className}
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
        <Users size={13} className={active ? "text-white" : "text-slate-400"} />
        <span className="truncate">{className}</span>
      </button>
      <RowActionButton
        title="Rename class"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <Pencil size={12} />
      </RowActionButton>
      <RowActionButton
        title="Delete class"
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
          title="Delete class?"
          message={`"${className}" will be removed. Students in it will be kept but unassigned from any class.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}

function LevelRow({
  stage,
  level,
  selection,
  onSelect,
}: {
  stage: ClassStage;
  level: ClassLevel;
  selection: ClassSelection;
  onSelect: (selection: ClassSelection) => void;
}) {
  const { createClass, renameLevel, deleteLevel, renameClass, deleteClass } = useClasses();
  const [open, setOpen] = useState(true);
  const [addingClass, setAddingClass] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = selection.type === "level" && selection.stage === stage.stage && selection.level === level.level;

  if (editing) {
    return (
      <RenameInline
        initialValue={level.level}
        onSave={async (name) => {
          await renameLevel(level.id, name);
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
            onSelect({ type: "level", stage: stage.stage, level: level.level });
          }}
          className={`flex flex-1 items-center gap-1 px-2 py-1.5 text-left ${
            active ? "font-medium text-brand-700" : "text-slate-600"
          }`}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span className="truncate">{level.level}</span>
        </button>
        <RowActionButton
          title={`Add class in ${level.level}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
            setAddingClass(true);
          }}
        >
          <Plus size={13} />
        </RowActionButton>
        <RowActionButton
          title="Rename level"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil size={12} />
        </RowActionButton>
        <RowActionButton
          title="Delete level"
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
          {level.classes.map((cls) => (
            <ClassRow
              key={cls.id}
              className={cls.className}
              active={selection.type === "class" && selection.classId === cls.id}
              onSelect={() => onSelect({ type: "class", classId: cls.id })}
              onRename={(name) => renameClass(cls.id, name)}
              onDelete={() => deleteClass(cls.id)}
            />
          ))}
          {addingClass && (
            <AddInline
              placeholder="New class name"
              onAdd={(name) => createClass(level.id, name)}
              onDone={() => setAddingClass(false)}
            />
          )}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title="Delete level?"
          message={`"${level.level}" and all its classes will be removed. Students in those classes will be kept but unassigned.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => deleteLevel(level.id)}
        />
      )}
    </div>
  );
}

function StageRow({
  stage,
  selection,
  onSelect,
}: {
  stage: ClassStage;
  selection: ClassSelection;
  onSelect: (selection: ClassSelection) => void;
}) {
  const { createLevel, renameStage, deleteStage } = useClasses();
  const [open, setOpen] = useState(true);
  const [addingLevel, setAddingLevel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const active = selection.type === "stage" && selection.stage === stage.stage;

  if (editing) {
    return (
      <div className="ml-2">
        <RenameInline
          initialValue={stage.stage}
          onSave={async (name) => {
            await renameStage(stage.id, name);
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
            onSelect({ type: "stage", stage: stage.stage });
          }}
          className={`flex flex-1 items-center gap-1 px-2 py-1.5 text-left ${
            active ? "font-medium text-brand-700" : "text-slate-700"
          }`}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="truncate" dir="rtl">
            {stage.stage}
          </span>
        </button>
        <RowActionButton
          title={`Add level in ${stage.stage}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
            setAddingLevel(true);
          }}
        >
          <Plus size={13} />
        </RowActionButton>
        <RowActionButton
          title="Rename category"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <Pencil size={12} />
        </RowActionButton>
        <RowActionButton
          title="Delete category"
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
          {stage.levels.map((level) => (
            <LevelRow key={level.id} stage={stage} level={level} selection={selection} onSelect={onSelect} />
          ))}
          {addingLevel && (
            <AddInline
              placeholder="New level name"
              onAdd={(name) => createLevel(stage.id, name)}
              onDone={() => setAddingLevel(false)}
            />
          )}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          title="Delete category?"
          message={`"${stage.stage}" and everything inside it (levels and classes) will be removed. Students in those classes will be kept but unassigned.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => deleteStage(stage.id)}
        />
      )}
    </div>
  );
}

export default function ClassTree() {
  const { tree, selection, setSelection, createStage } = useClasses();
  const [addingStage, setAddingStage] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          <Layers size={11} />
        </span>
        Hierarchy of Classes
      </div>

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
            <School size={15} className="text-brand-600" />
            My School
          </button>
          <button
            type="button"
            onClick={() => setAddingStage(true)}
            title="Add category (stage)"
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <Plus size={14} />
          </button>
        </div>

        {addingStage && (
          <AddInline placeholder="New category name" onAdd={createStage} onDone={() => setAddingStage(false)} />
        )}

        {tree.map((stageNode) => (
          <StageRow key={stageNode.id} stage={stageNode} selection={selection} onSelect={setSelection} />
        ))}
      </div>
    </div>
  );
}
