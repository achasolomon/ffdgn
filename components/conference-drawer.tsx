"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function ConferenceDrawer({ title, label, children, busy = false, className = "rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-forest-900", disabled = false, open: controlledOpen, onOpenChange }: { title: string; label: string; children: ReactNode; busy?: boolean; className?: string; disabled?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  const [internalOpen, setInternalOpen] = useState(false), [mounted, setMounted] = useState(false);
  const open = controlledOpen ?? internalOpen;
  function setOpen(value: boolean) { setInternalOpen(value); onOpenChange?.(value); }
  useEffect(() => {
    if (!open) { if (dialog.current?.open) dialog.current.close(); return; }
    const element = dialog.current!; if (!element.open) element.showModal();
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function close() { if (!busy) dialog.current?.close(); }
  return <><button ref={trigger} type="button" disabled={disabled} className={className} onClick={() => { setMounted(true); setOpen(true); }}>{label}</button><dialog ref={dialog} aria-labelledby={id} onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => { setOpen(false); trigger.current?.focus(); }} className="conference-drawer"><header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4"><h2 id={id} className="min-w-0 break-words text-lg font-semibold text-forest-900">{title}</h2><button type="button" aria-label={`Close ${title}`} disabled={busy} onClick={close} className="min-h-11 shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">Close</button></header><div className="min-h-0 overflow-auto p-4 sm:p-5">{(mounted || open) && children}</div></dialog><style>{`.conference-drawer{box-sizing:border-box;position:fixed;inset:0 0 0 auto;margin:0;border:0;border-left:1px solid #dce3da;border-radius:0;padding:0;width:min(620px,100%);max-width:100%;height:100dvh;max-height:100dvh;color:#123e2a;background:white;box-shadow:-12px 0 64px #071b1630}.conference-drawer[open]{display:flex;flex-direction:column;animation:conference-drawer-in .2s ease-out}.conference-drawer::backdrop{background:#071b1655}.conference-drawer input,.conference-drawer select,.conference-drawer textarea{max-width:100%}@keyframes conference-drawer-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@media(prefers-reduced-motion:reduce){.conference-drawer[open]{animation:none}}`}</style></>;
}
