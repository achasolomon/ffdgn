"use client";
import { useState } from "react";

/**
 * Change-password form for /portal/profile.
 *
 * Deliberately asks for the current password even though the caller already has
 * a valid session: a stolen session cookie must not be enough to lock the real
 * owner out of their own account. The endpoint enforces the same rule, this
 * just makes the requirement visible before submitting.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "The two new passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? `Could not change password (${res.status}).`);
      setMsg({ ok: true, text: data?.data?.message ?? "Password updated." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border hairline bg-white p-6" aria-label="Change password">
      <h2 className="font-display text-xl text-forest-950">Change password</h2>
      <p className="mt-1 text-[13px] text-ink/70">
        At least 12 characters. Changing it signs out every other session on this account.
      </p>

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`mt-4 border px-4 py-2.5 text-sm ${
            msg.ok
              ? "border-green-800/30 bg-green-50 text-green-900"
              : "border-red-800/30 bg-red-50 text-red-900"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="cp-cur" className="text-[13px] font-semibold">
            Current password
          </label>
          <input
            id="cp-cur"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="cp-new" className="text-[13px] font-semibold">
            New password
          </label>
          <input
            id="cp-new"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="text-[13px] font-semibold">
            Confirm new password
          </label>
          <input
            id="cp-confirm"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2 text-sm"
          />
        </div>
      </div>

      <button
        disabled={busy}
        className="mt-5 bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
