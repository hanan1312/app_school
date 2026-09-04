import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ShieldCheck, Plus, Trash2, UserCircle, Upload, Download, Lock, Activity, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { downloadExcel } from "../lib/excel";
import type { SystemUser, SystemUserInput } from "../lib/types";
import SystemUserModal from "../components/SystemUserModal";
import UserPermissionsModal from "../components/UserPermissionsModal";
import CsvImportModal, { type ImportColumn } from "../components/CsvImportModal";
import ActivityMonitor from "../components/ActivityMonitor";

type OutletCtx = { notify: (label: string) => void };

const USER_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "username", label: "Username", required: true, example: "jsmith" },
  { key: "fullName", label: "Full Name", required: true, example: "Jane Smith" },
  { key: "password", label: "Password", required: true, example: "TempPass123" },
  { key: "role", label: "Role", example: "staff" },
];

function mapUserImportRow(raw: Record<string, string>): { input?: SystemUserInput; error?: string } {
  return {
    input: {
      username: raw.username,
      fullName: raw.fullName,
      password: raw.password,
      role: raw.role?.trim() || "staff",
    },
  };
}

export default function UsersPage() {
  useOutletContext<OutletCtx>();
  const { token, user: me } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SystemUser | null>(null);
  const [managingPermissions, setManagingPermissions] = useState<SystemUser | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"users" | "activity">("users");
  // Passwords are one-way hashed server-side — there's no real value to reveal here, only
  // whether the masked dots are shown at rest or on demand per row.
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const toggleRevealed = (id: number) =>
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getUsers(token);
      setUsers(res.users);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreate = async (input: SystemUserInput) => {
    if (!token) return;
    await api.createUser(token, input);
    setModalOpen(false);
    await load();
  };

  const handleUpdate = async (input: SystemUserInput) => {
    if (!token || !editing) return;
    await api.updateUser(token, editing.id, input);
    setEditing(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    setErrorMsg(null);
    try {
      await api.deleteUser(token, pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not delete user.");
      setPendingDelete(null);
    }
  };

  const handleExport = () => {
    const headers = ["Username", "Full Name", "Role"];
    const rows = users.map((u) => ({ Username: u.username, "Full Name": u.full_name, Role: u.role }));
    downloadExcel("system-users.xlsx", headers, rows);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center border-r border-slate-200 px-3 last:border-r-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab("users")}
              className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                tab === "users" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <ShieldCheck size={18} />
              <span>Users</span>
            </button>
            <button
              onClick={() => setTab("activity")}
              className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                tab === "activity" ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              <Activity size={18} />
              <span>Activity</span>
            </button>
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">View</span>
        </div>

        {tab === "users" && (
          <div className="flex flex-col items-center border-r border-slate-200 px-3 last:border-r-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setModalOpen(true)}
                className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
              >
                <Plus size={18} />
                <span>New User</span>
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
              >
                <Upload size={18} />
                <span>Import</span>
              </button>
              <button
                onClick={handleExport}
                className="flex flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm active:translate-y-0"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Access Control</span>
          </div>
        )}
      </div>

      {tab === "users" && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <ShieldCheck size={15} className="text-brand-500" />
          <span>System users and their access roles</span>
          <span className="text-slate-300">&middot;</span>
          <span>
            {users.length} user{users.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {tab === "activity" && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Activity size={15} className="text-brand-500" />
          <span>Who&apos;s online, idle, or offline — and everyone&apos;s recent actions</span>
        </div>
      )}

      <div className="flex-1 overflow-auto px-4 py-3">
        {tab === "users" && (
          <>
            {errorMsg && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}

            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-0.5 before:bg-gradient-to-r before:from-brand-500 before:via-brand-400 before:to-gold-400 before:opacity-70 before:content-['']">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Username</th>
                    <th className="px-3 py-2.5">Full name</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Password</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-slate-400">
                        Loading users…
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    users.map((u) => (
                      <tr key={u.id} onClick={() => setEditing(u)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <UserCircle size={16} className="text-slate-300" />
                            {u.username}
                            {u.id === me?.id && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{u.full_name}</td>
                        <td className="px-3 py-2.5 capitalize text-slate-500">{u.role}</td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleRevealed(u.id)}
                            title="Passwords are one-way hashed and can't be displayed — this only shows/hides the mask"
                            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600"
                          >
                            {revealedIds.has(u.id) ? (
                              <>
                                <EyeOff size={13} />
                                <span className="tracking-widest">••••••••</span>
                              </>
                            ) : (
                              <>
                                <Eye size={13} />
                                <span className="text-xs text-slate-300">Hidden</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {(me?.role === "admin" || me?.role === "master") && (
                              <button
                                onClick={() => setManagingPermissions(u)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                                title="Manage access"
                              >
                                <Lock size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => setPendingDelete(u)}
                              disabled={u.id === me?.id}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                              title={u.id === me?.id ? "You cannot delete your own account" : "Delete"}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "activity" && token && <ActivityMonitor token={token} />}
      </div>

      {modalOpen && <SystemUserModal onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}

      {editing && <SystemUserModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}

      {managingPermissions && (
        <UserPermissionsModal targetUser={managingPermissions} onClose={() => setManagingPermissions(null)} />
      )}

      {importOpen && token && (
        <CsvImportModal<SystemUserInput>
          title="Import System Users"
          description="Password is required for each new account — have users change it after first login."
          templateFilename="users-template.csv"
          columns={USER_IMPORT_COLUMNS}
          mapRow={mapUserImportRow}
          onImportRow={(input) => api.createUser(token, input).then(() => {})}
          onClose={() => setImportOpen(false)}
          onFinished={load}
        />
      )}

      {pendingDelete && (
        <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-sm">
          <div className="animate-rise-in w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-slate-800">Remove user?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              This will revoke access for{" "}
              <span className="font-medium text-slate-700">{pendingDelete.full_name}</span>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
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
