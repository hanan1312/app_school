import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "../context/AuthContext";
import type { Subject } from "./types";

// The full Time Table > Subjects catalog (unfiltered by level), shared by the Position tab's
// Teacher subject picker and the HR sidebar tree's per-subject grouping under the Teachers
// division, so both read the same live list instead of each fetching it separately.
export function useSubjects(): Subject[] {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    if (!token) return;
    api
      .getSubjects(token)
      .then((res) => setSubjects(res.subjects))
      .catch(() => setSubjects([]));
  }, [token]);
  return subjects;
}
