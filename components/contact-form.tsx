"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type State = "idle" | "pending" | "sent";

/**
 * Secretariat enquiry form. Posts to /api/v1/contact (rate limited, validated,
 * honeypot-protected) and reports outcome accessibly: inline `role="alert"` on
 * failure, a confirmation panel on success.
 */
export function ContactForm({ subject: prefillSubject = "" }: { subject?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(prefillSubject);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, website: "" }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.errors?.[0]?.message ?? "Your message could not be sent. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Your message could not be sent. Please try again, or email the Secretariat directly.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="border hairline bg-white p-6 md:p-8" role="status">
        <p className="flex items-center gap-2 font-display text-xl text-forest-950">
          <CheckCircle2 size={20} className="text-primary" /> Message received
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Thank you — your enquiry has been logged with the Secretariat and a reference
          will be provided by email. For urgent conference matters, please call the
          Secretariat directly.
        </p>
        <button
          onClick={() => { setState("idle"); setMessage(""); setSubject(""); }}
          className="mt-5 border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
        >
          Send another message →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border hairline bg-white p-6 md:p-8" aria-label="Contact form">
      <h2 className="font-display text-xl text-forest-950">Send a message</h2>
      {error && (
        <p role="alert" className="mt-4 border border-red-800/30 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="cname" className="text-[13px] font-semibold">Full name</label>
          <input id="cname" name="name" required autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="cemail" className="text-[13px] font-semibold">Email</label>
          <input id="cemail" name="email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2.5 text-sm" />
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="csubject" className="text-[13px] font-semibold">Subject</label>
        <input id="csubject" name="subject" required value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full border hairline px-4 py-2.5 text-sm" />
      </div>
      <div className="mt-4">
        <label htmlFor="cmsg" className="text-[13px] font-semibold">Message</label>
        <textarea id="cmsg" name="message" rows={5} required value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full border hairline px-4 py-2.5 text-sm" />
      </div>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="cwebsite">Website</label>
        <input id="cwebsite" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button disabled={state === "pending"}
        className="mt-5 bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
        {state === "pending" ? "Sending…" : "Send message →"}
      </button>
      <p className="mt-3 text-[12.5px] text-ink/50">
        Messages are handled by the Secretariat. We use your details only to respond to this enquiry.
      </p>
    </form>
  );
}
