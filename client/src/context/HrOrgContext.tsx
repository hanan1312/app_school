import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useSchools } from "./SchoolsContext";
import type { HrOrgDivision } from "../lib/types";

export type HrOrgSelection =
  | { type: "all" }
  | { type: "division"; division: string }
  | { type: "section"; division: string; section: string }
  | { type: "job"; division: string; section: string; job: string };

type HrOrgContextValue = {
  tree: HrOrgDivision[];
  loading: boolean;
  selection: HrOrgSelection;
  setSelection: (selection: HrOrgSelection) => void;
  createDivision: (name: string) => Promise<void>;
  renameDivision: (id: number, name: string) => Promise<void>;
  deleteDivision: (id: number) => Promise<void>;
  createSection: (divisionId: number, name: string) => Promise<void>;
  renameSection: (id: number, name: string) => Promise<void>;
  deleteSection: (id: number) => Promise<void>;
  createJob: (sectionId: number, name: string) => Promise<void>;
  renameJob: (id: number, name: string) => Promise<void>;
  deleteJob: (id: number) => Promise<void>;
};

const HrOrgContext = createContext<HrOrgContextValue | null>(null);

export function HrOrgProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { selectedSchoolId } = useSchools();
  const [tree, setTree] = useState<HrOrgDivision[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<HrOrgSelection>({ type: "all" });

  const load = async () => {
    if (!token || !selectedSchoolId) {
      setTree([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getHrOrgTree(token, selectedSchoolId);
      setTree(res.tree);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelection({ type: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedSchoolId]);

  const createDivision = async (name: string) => {
    if (!token || !selectedSchoolId) return;
    const res = await api.createHrOrgDivision(token, selectedSchoolId, name);
    setTree(res.tree);
  };

  const renameDivision = async (id: number, name: string) => {
    if (!token) return;
    const res = await api.renameHrOrgDivision(token, id, name);
    setTree(res.tree);
  };

  const deleteDivision = async (id: number) => {
    if (!token) return;
    const res = await api.deleteHrOrgDivision(token, id);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const createSection = async (divisionId: number, name: string) => {
    if (!token) return;
    const res = await api.createHrOrgSection(token, divisionId, name);
    setTree(res.tree);
  };

  const renameSection = async (id: number, name: string) => {
    if (!token) return;
    const res = await api.renameHrOrgSection(token, id, name);
    setTree(res.tree);
  };

  const deleteSection = async (id: number) => {
    if (!token) return;
    const res = await api.deleteHrOrgSection(token, id);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const createJob = async (sectionId: number, name: string) => {
    if (!token) return;
    const res = await api.createHrOrgJob(token, sectionId, name);
    setTree(res.tree);
  };

  const renameJob = async (id: number, name: string) => {
    if (!token) return;
    const res = await api.renameHrOrgJob(token, id, name);
    setTree(res.tree);
  };

  const deleteJob = async (id: number) => {
    if (!token) return;
    const res = await api.deleteHrOrgJob(token, id);
    setTree(res.tree);
    setSelection({ type: "all" });
  };

  const value: HrOrgContextValue = {
    tree,
    loading,
    selection,
    setSelection,
    createDivision,
    renameDivision,
    deleteDivision,
    createSection,
    renameSection,
    deleteSection,
    createJob,
    renameJob,
    deleteJob,
  };

  return <HrOrgContext.Provider value={value}>{children}</HrOrgContext.Provider>;
}

export function useHrOrg() {
  const ctx = useContext(HrOrgContext);
  if (!ctx) throw new Error("useHrOrg must be used within HrOrgProvider");
  return ctx;
}
