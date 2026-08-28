import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import type { ClassStage } from "../lib/types";

export type ClassSelection =
  | { type: "all" }
  | { type: "stage"; stage: string }
  | { type: "level"; stage: string; level: string }
  | { type: "class"; classId: number };

type ClassesContextValue = {
  tree: ClassStage[];
  loading: boolean;
  selection: ClassSelection;
  setSelection: (selection: ClassSelection) => void;
  selectedClassIds: number[] | null;
  selectedClassId: number | null;
  setSelectedClassId: (id: number | null) => void;
  selectedClassName: string | null;
  createStage: (name: string) => Promise<void>;
  createLevel: (stageId: number, name: string) => Promise<void>;
  createClass: (levelId: number, name: string) => Promise<void>;
  renameStage: (stageId: number, name: string) => Promise<void>;
  deleteStage: (stageId: number) => Promise<void>;
  renameLevel: (levelId: number, name: string) => Promise<void>;
  deleteLevel: (levelId: number) => Promise<void>;
  renameClass: (classId: number, name: string) => Promise<void>;
  deleteClass: (classId: number) => Promise<void>;
};

const ClassesContext = createContext<ClassesContextValue | null>(null);

export function ClassesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [tree, setTree] = useState<ClassStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<ClassSelection>({ type: "all" });

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getClasses(token)
      .then((res) => setTree(res.tree))
      .catch(() => setTree([]))
      .finally(() => setLoading(false));
  }, [token]);

  const selectedClassIds = useMemo(() => {
    if (selection.type === "all") return null;
    if (selection.type === "class") return [selection.classId];
    if (selection.type === "stage") {
      return tree
        .filter((s) => s.stage === selection.stage)
        .flatMap((s) => s.levels.flatMap((l) => l.classes.map((c) => c.id)));
    }
    return tree
      .filter((s) => s.stage === selection.stage)
      .flatMap((s) => s.levels.filter((l) => l.level === selection.level).flatMap((l) => l.classes.map((c) => c.id)));
  }, [tree, selection]);

  const selectedClassId = selection.type === "class" ? selection.classId : null;

  const selectedClassName = useMemo(() => {
    if (selectedClassId == null) return null;
    for (const stage of tree) {
      for (const level of stage.levels) {
        const found = level.classes.find((c) => c.id === selectedClassId);
        if (found) return found.className;
      }
    }
    return null;
  }, [tree, selectedClassId]);

  const setSelectedClassId = (id: number | null) => {
    setSelection(id == null ? { type: "all" } : { type: "class", classId: id });
  };

  const createStage = async (name: string) => {
    if (!token) return;
    const res = await api.createStage(token, name);
    setTree(res.tree);
  };

  const createLevel = async (stageId: number, name: string) => {
    if (!token) return;
    const res = await api.createLevel(token, stageId, name);
    setTree(res.tree);
  };

  const createClass = async (levelId: number, name: string) => {
    if (!token) return;
    const res = await api.createClass(token, levelId, name);
    setTree(res.tree);
  };

  const renameStage = async (stageId: number, name: string) => {
    if (!token) return;
    const res = await api.renameStage(token, stageId, name);
    setTree(res.tree);
  };

  const deleteStage = async (stageId: number) => {
    if (!token) return;
    const res = await api.deleteStage(token, stageId);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const renameLevel = async (levelId: number, name: string) => {
    if (!token) return;
    const res = await api.renameLevel(token, levelId, name);
    setTree(res.tree);
  };

  const deleteLevel = async (levelId: number) => {
    if (!token) return;
    const res = await api.deleteLevel(token, levelId);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const renameClass = async (classId: number, name: string) => {
    if (!token) return;
    const res = await api.renameClass(token, classId, name);
    setTree(res.tree);
  };

  const deleteClass = async (classId: number) => {
    if (!token) return;
    const res = await api.deleteClass(token, classId);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const value = useMemo(
    () => ({
      tree,
      loading,
      selection,
      setSelection,
      selectedClassIds,
      selectedClassId,
      setSelectedClassId,
      selectedClassName,
      createStage,
      createLevel,
      createClass,
      renameStage,
      deleteStage,
      renameLevel,
      deleteLevel,
      renameClass,
      deleteClass,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, loading, selection, selectedClassIds, selectedClassId, selectedClassName, token]
  );

  return <ClassesContext.Provider value={value}>{children}</ClassesContext.Provider>;
}

export function useClasses() {
  const ctx = useContext(ClassesContext);
  if (!ctx) throw new Error("useClasses must be used within ClassesProvider");
  return ctx;
}
