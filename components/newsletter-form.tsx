"use client";
import { useState } from "react";

/**
 * Homepage newsletter signup. Submits to the same validated endpoint as the
 * Secretariat contact form — email only, never placed in the URL.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: email.split("@")[0] || "Newsletter subscriber",
          email,
          subject: "Newsletter subscription",
          message: "Please add this address to the Forum mailing list for official publications, conference announcements and Forum updates.",
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.errors?.[0]?.message ?? "Subscription failed. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Subscription failed. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="text-sm font-semibold text-forest-950">
        Thank you — you have been added to the Forum mailing list.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md" aria-label="Subscribe to Forum updates">
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">Email address</label>
        <input id="nl-email" name="email" type="email" required autoComplete="email"
          placeholder="Enter your email address" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border hairline bg-white px-4 py-2.5 text-sm" />
        <button disabled={state === "pending"}
          className="shrink-0 bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">
          {state === "pending" ? "…" : "Subscribe →"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-red-800">{error}</p>}
    </form>
  );
}
