import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useSchools } from "./SchoolsContext";
import type { HrEmployee } from "../lib/types";

export type HrTreeSelection =
  | { type: "all" }
  | { type: "division"; division: string }
  | { type: "section"; division: string; section: string }
  | { type: "job"; division: string; section: string; job: string };

export type HrTreeJobNode = { job: string; count: number };
export type HrTreeSectionNode = { section: string; count: number; jobs: HrTreeJobNode[] };
export type HrTreeDivisionNode = { division: string; count: number; sections: HrTreeSectionNode[] };

const UNSPECIFIED = "Unspecified";

function buildTree(employees: HrEmployee[]): HrTreeDivisionNode[] {
  const divisions = new Map<string, Map<string, Map<string, number>>>();

  for (const e of employees) {
    const division = e.division || UNSPECIFIED;
    const section = e.section || UNSPECIFIED;
    const job = e.job || UNSPECIFIED;

    if (!divisions.has(division)) divisions.set(division, new Map());
    const sections = divisions.get(division)!;
    if (!sections.has(section)) sections.set(section, new Map());
    const jobs = sections.get(section)!;
    jobs.set(job, (jobs.get(job) ?? 0) + 1);
  }

  return [...divisions.entries()].map(([division, sections]) => {
    const sectionNodes: HrTreeSectionNode[] = [...sections.entries()].map(([section, jobs]) => {
      const jobNodes: HrTreeJobNode[] = [...jobs.entries()].map(([job, count]) => ({ job, count }));
      const sectionCount = jobNodes.reduce((sum, j) => sum + j.count, 0);
      return { section, count: sectionCount, jobs: jobNodes };
    });
    const divisionCount = sectionNodes.reduce((sum, s) => sum + s.count, 0);
    return { division, count: divisionCount, sections: sectionNodes };
  });
}

function matchesSelection(e: HrEmployee, selection: HrTreeSelection): boolean {
  if (selection.type === "all") return true;
  const division = e.division || UNSPECIFIED;
  if (division !== selection.division) return false;
  if (selection.type === "division") return true;
  const section = e.section || UNSPECIFIED;
  if (section !== selection.section) return false;
  if (selection.type === "section") return true;
  const job = e.job || UNSPECIFIED;
  return job === selection.job;
}

type HrEmployeesContextValue = {
  employees: HrEmployee[];
  loading: boolean;
  tree: HrTreeDivisionNode[];
  selection: HrTreeSelection;
  setSelection: (selection: HrTreeSelection) => void;
  filteredEmployees: HrEmployee[];
  refresh: () => Promise<void>;
};

const HrEmployeesContext = createContext<HrEmployeesContextValue | null>(null);

export function HrEmployeesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { selectedSchoolId } = useSchools();
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<HrTreeSelection>({ type: "all" });

  const load = async () => {
    if (!token || !selectedSchoolId) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getHrEmployees(token, { schoolId: selectedSchoolId });
      setEmployees(res.employees);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setSelection({ type: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedSchoolId]);

  const tree = useMemo(() => buildTree(employees), [employees]);
  const filteredEmployees = useMemo(
    () => employees.filter((e) => matchesSelection(e, selection)),
    [employees, selection]
  );

  const value = useMemo(
    () => ({ employees, loading, tree, selection, setSelection, filteredEmployees, refresh: load }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, loading, tree, selection, filteredEmployees]
  );

  return <HrEmployeesContext.Provider value={value}>{children}</HrEmployeesContext.Provider>;
}

export function useHrEmployees() {
  const ctx = useContext(HrEmployeesContext);
  if (!ctx) throw new Error("useHrEmployees must be used within HrEmployeesProvider");
  return ctx;
}
