const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const ASSET_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function assetUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${ASSET_ORIGIN}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

async function request<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A 401 on an authenticated request means the stored token is stale/expired,
    // not that these particular credentials were wrong (that's the login endpoint,
    // which never sends a token) — force a fresh sign-in instead of leaving the
    // stale session's requests failing silently in the background.
    if (res.status === 401 && token) sessionExpiredHandler?.();
    throw new ApiError(data.error ?? "Request failed", res.status);
  }

  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: import("./types").User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getMe: (token: string) => request<{ user: import("./types").User }>("/auth/me", { token }),

  getUserPermissions: (token: string, userId: number) =>
    request<{ role: string; modules: string[] }>(`/permissions/${userId}`, { token }),

  updateUserPermissions: (token: string, userId: number, modules: string[]) =>
    request<{ role: string; modules: string[] }>(`/permissions/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ modules }),
      token,
    }),

  getClasses: (token: string) => request<{ tree: any[]; flat: any[] }>("/classes", { token }),

  createStage: (token: string, name: string) =>
    request<{ tree: any[]; flat: any[] }>("/classes/stages", { method: "POST", body: JSON.stringify({ name }), token }),

  createLevel: (token: string, stageId: number, name: string) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/stages/${stageId}/levels`, {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    }),

  createClass: (token: string, levelId: number, name: string) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/levels/${levelId}/classes`, {
      method: "POST",
      body: JSON.stringify({ name }),
      token,
    }),

  renameStage: (token: string, stageId: number, name: string) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/stages/${stageId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
      token,
    }),

  deleteStage: (token: string, stageId: number) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/stages/${stageId}`, { method: "DELETE", token }),

  renameLevel: (token: string, levelId: number, name: string) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/levels/${levelId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
      token,
    }),

  deleteLevel: (token: string, levelId: number) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/levels/${levelId}`, { method: "DELETE", token }),

  renameClass: (token: string, classId: number, name: string) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
      token,
    }),

  deleteClass: (token: string, classId: number) =>
    request<{ tree: any[]; flat: any[] }>(`/classes/${classId}`, { method: "DELETE", token }),

  getStudents: (token: string, params: { classId?: number; classIds?: number[]; q?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.classIds) search.set("classIds", params.classIds.join(","));
    else if (params.classId) search.set("classId", String(params.classId));
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ students: any[]; count: number }>(`/students${qs ? `?${qs}` : ""}`, { token });
  },

  createStudent: (token: string, body: unknown) =>
    request<{ student: any }>("/students", { method: "POST", body: JSON.stringify(body), token }),

  updateStudent: (token: string, id: number, body: unknown) =>
    request<{ student: any }>(`/students/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteStudent: (token: string, id: number) =>
    request<void>(`/students/${id}`, { method: "DELETE", token }),

  deleteStudents: (token: string, ids: number[]) =>
    request<{ ok: true; deleted: number }>("/students", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
      token,
    }),

  uploadStudentPhoto: async (token: string, studentId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/students/${studentId}/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "Upload failed", res.status);
    return data as { student: any };
  },

  removeStudentPhoto: (token: string, studentId: number) =>
    request<{ student: any }>(`/students/${studentId}/photo`, { method: "DELETE", token }),

  getFeeTypes: (token: string) => request<{ feeTypes: any[] }>("/finance/fee-types", { token }),

  createFeeType: (token: string, body: unknown) =>
    request<{ feeType: any }>("/finance/fee-types", { method: "POST", body: JSON.stringify(body), token }),

  deleteFeeType: (token: string, id: number) =>
    request<void>(`/finance/fee-types/${id}`, { method: "DELETE", token }),

  getPayments: (token: string, params: { classId?: number; studentId?: number; q?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.classId) search.set("classId", String(params.classId));
    if (params.studentId) search.set("studentId", String(params.studentId));
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ payments: any[]; count: number; total: number }>(
      `/finance/payments${qs ? `?${qs}` : ""}`,
      { token }
    );
  },

  createPayment: (token: string, body: unknown) =>
    request<{ payment: any }>("/finance/payments", { method: "POST", body: JSON.stringify(body), token }),

  updatePayment: (token: string, id: number, body: unknown) =>
    request<{ payment: any }>(`/finance/payments/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deletePayment: (token: string, id: number) =>
    request<void>(`/finance/payments/${id}`, { method: "DELETE", token }),

  getTimetable: (token: string, classId: number) =>
    request<{ entries: any[] }>(`/timetable?classId=${classId}`, { token }),

  createTimetableEntry: (token: string, body: unknown) =>
    request<{ entry: any }>("/timetable", { method: "POST", body: JSON.stringify(body), token }),

  updateTimetableEntry: (token: string, id: number, body: unknown) =>
    request<{ entry: any }>(`/timetable/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteTimetableEntry: (token: string, id: number) =>
    request<void>(`/timetable/${id}`, { method: "DELETE", token }),

  getBuses: (token: string) => request<{ buses: any[] }>("/buses", { token }),

  createBus: (token: string, body: unknown) =>
    request<{ bus: any }>("/buses", { method: "POST", body: JSON.stringify(body), token }),

  updateBus: (token: string, id: number, body: unknown) =>
    request<{ bus: any }>(`/buses/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteBus: (token: string, id: number) => request<void>(`/buses/${id}`, { method: "DELETE", token }),

  getBusRiders: (token: string, busId: number) =>
    request<{ students: any[] }>(`/buses/${busId}/students`, { token }),

  addBusRider: (token: string, busId: number, body: unknown) =>
    request<{ ok: true }>(`/buses/${busId}/students`, { method: "POST", body: JSON.stringify(body), token }),

  removeBusRider: (token: string, busId: number, studentId: number) =>
    request<void>(`/buses/${busId}/students/${studentId}`, { method: "DELETE", token }),

  getInventory: (token: string, params: { q?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ items: any[]; count: number }>(`/inventory${qs ? `?${qs}` : ""}`, { token });
  },

  createInventoryItem: (token: string, body: unknown) =>
    request<{ item: any }>("/inventory", { method: "POST", body: JSON.stringify(body), token }),

  updateInventoryItem: (token: string, id: number, body: unknown) =>
    request<{ item: any }>(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteInventoryItem: (token: string, id: number) =>
    request<void>(`/inventory/${id}`, { method: "DELETE", token }),

  getUsers: (token: string) => request<{ users: any[] }>("/users", { token }),

  createUser: (token: string, body: unknown) =>
    request<{ user: any }>("/users", { method: "POST", body: JSON.stringify(body), token }),

  updateUser: (token: string, id: number, body: unknown) =>
    request<{ user: any }>(`/users/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteUser: (token: string, id: number) => request<void>(`/users/${id}`, { method: "DELETE", token }),

  getStaff: (token: string, params: { q?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ staff: any[]; count: number }>(`/staff${qs ? `?${qs}` : ""}`, { token });
  },

  createStaff: (token: string, body: unknown) =>
    request<{ staff: any }>("/staff", { method: "POST", body: JSON.stringify(body), token }),

  updateStaff: (token: string, id: number, body: unknown) =>
    request<{ staff: any }>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(body), token }),

  deleteStaff: (token: string, id: number) => request<void>(`/staff/${id}`, { method: "DELETE", token }),

  getSettings: (token: string) => request<{ settings: Record<string, string> }>("/settings", { token }),

  updateSettings: (token: string, body: Record<string, string>) =>
    request<{ settings: Record<string, string> }>("/settings", { method: "PUT", body: JSON.stringify(body), token }),

  getPublicSettings: () => request<{ settings: Record<string, string> }>("/settings/public"),

  uploadBranding: async (token: string, kind: "logo" | "background", file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/settings/branding/${kind}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "Upload failed", res.status);
    return data as { settings: Record<string, string> };
  },

  removeBranding: (token: string, kind: "logo" | "background") =>
    request<{ settings: Record<string, string> }>(`/settings/branding/${kind}`, { method: "DELETE", token }),

  getAttendance: (token: string, params: { classId?: number; date: string }) => {
    const search = new URLSearchParams();
    if (params.classId) search.set("classId", String(params.classId));
    search.set("date", params.date);
    return request<{ records: any[] }>(`/attendance?${search.toString()}`, { token });
  },

  saveAttendanceBulk: (token: string, date: string, entries: unknown[]) =>
    request<{ ok: true; count: number }>("/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({ date, entries }),
      token,
    }),

  getNoShow: (token: string, params: { classId?: number; date: string }) => {
    const search = new URLSearchParams();
    if (params.classId) search.set("classId", String(params.classId));
    search.set("date", params.date);
    return request<{ students: any[]; count: number }>(`/attendance/no-show?${search.toString()}`, { token });
  },

  getAttendanceAnalysis: (token: string, params: { classId?: number; from: string; to: string }) => {
    const search = new URLSearchParams();
    if (params.classId) search.set("classId", String(params.classId));
    search.set("from", params.from);
    search.set("to", params.to);
    return request<{ rows: any[] }>(`/attendance/analysis?${search.toString()}`, { token });
  },

  getAdmissions: (token: string, status?: string) =>
    request<{ admissions: any[] }>(`/admissions${status ? `?status=${status}` : ""}`, { token }),

  createAdmission: (token: string, body: unknown) =>
    request<{ admission: any }>("/admissions", { method: "POST", body: JSON.stringify(body), token }),

  approveAdmission: (token: string, id: number, classId?: number) =>
    request<{ student: any }>(`/admissions/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({ classId }),
      token,
    }),

  rejectAdmission: (token: string, id: number) =>
    request<{ admission: any }>(`/admissions/${id}/reject`, { method: "PUT", token }),

  deleteAdmission: (token: string, id: number) => request<void>(`/admissions/${id}`, { method: "DELETE", token }),
};
