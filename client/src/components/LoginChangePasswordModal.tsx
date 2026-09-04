import { useState, type FormEvent } from "react";
import { X, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

// Reachable from the Login page itself (before any session exists) via a "Change Password"
// link — verifies identity with username + current password, the same bar as logging in,
// then signs the user straight in with the new one so they don't have to retype it.
export default function LoginChangePasswordModal({
  initialUsername,
  onClose,
}: {
  initialUsername: string;
  onClose: () => void;
}) {
  const { login } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !currentPassword || !newPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError("New password must be at least 8 characters and include both letters and numbers.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.resetPasswordWithCurrent({ username: username.trim(), currentPassword, newPassword });
      await login(username.trim(), newPassword);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm">
      <div className="animate-rise-in w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-gold-400" />
            <h2 className="text-base font-semibold text-white">Change Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus={!initialUsername}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus={Boolean(initialUsername)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
            />
            <p className="mt-1 text-[11px] text-white/40">At least 8 characters, with both letters and numbers.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="animate-gradient-pan rounded-xl bg-gradient-to-r from-gold-400 via-gold-300 to-gold-600 bg-[length:200%_auto] px-4 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-600/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save & Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
