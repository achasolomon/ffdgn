"use client";
import { useEffect, useId, useRef } from "react";

export function ConferenceGateResult({ open, guest, checkedIn, busy, message, onClose, onConfirm, onNext }: {
  open: boolean; guest: { fullName: string; category: string; organization: string; jobTitle: string; blocked: string | null; eligible: boolean; admission: { at: string } | null; alreadyAdmitted?: boolean } | null;
  checkedIn: boolean; busy: boolean; message: string; onClose: () => void; onConfirm: () => void; onNext: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), title = useId();
  useEffect(() => {
    if (!open || !guest) return;
    const element = dialog.current!, previousFocus = document.activeElement as HTMLElement | null;
    if (!element.open) element.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open, guest]);
  const blocked = !!guest?.blocked, duplicate = !!guest?.admission && (!checkedIn || guest.alreadyAdmitted);
  const heading = blocked ? "Entry not allowed" : duplicate ? "Already checked in" : checkedIn ? "Guest checked in successfully" : "Guest verified";
  return <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="gate-result w-[calc(100%_-_2rem)] max-w-md rounded-2xl border-0 p-6 text-center shadow-xl">
    <div aria-hidden="true" className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${blocked ? "bg-red-100 text-red-800" : duplicate ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{blocked ? "!" : duplicate ? "!" : "✓"}</div>
    <h2 id={title} className="text-2xl font-semibold text-forest-900">{heading}</h2>
    <p className="mt-4 break-words text-xl font-semibold">{guest?.fullName}</p><p className="mt-1 font-semibold text-forest-900">{guest?.category}</p>
    <p className="mt-2 break-words text-sm text-gray-600">{[guest?.jobTitle, guest?.organization].filter(Boolean).join(" · ")}</p>
    <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm leading-6">{blocked ? `${guest?.blocked}. Please direct this guest to the registration desk.` : duplicate ? "This guest's entry has already been recorded. Do not check them in again." : checkedIn ? "Entry has been recorded. The guest may proceed." : "The QR is valid. Check the name against the guest, then confirm entry."}</p>
    {guest?.admission && <p className="mt-2 text-xs text-gray-600">Entry recorded: {new Date(guest.admission.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</p>}
    {message && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    <div className="mt-5 flex flex-col gap-3">
      {!blocked && !guest?.admission && guest?.eligible && <button disabled={busy} onClick={onConfirm} className="min-h-12 rounded-lg bg-forest-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving entry…" : "Confirm guest entry"}</button>}
      {(blocked || guest?.admission) && <button disabled={busy} onClick={onNext} className="min-h-12 rounded-lg bg-forest-900 px-4 py-3 font-semibold text-white disabled:opacity-50">Next guest</button>}
      <button disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50">View guest details</button>
    </div><style>{`.gate-result::backdrop{background:#071b1670}.gate-result{max-height:calc(100dvh - 2rem);overflow:auto}`}</style>
  </dialog>;
}
