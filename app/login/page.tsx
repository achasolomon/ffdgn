"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error") ? "Sign in failed. Check your credentials and try again." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", { email, password, callbackUrl, redirect: false });
    setPending(false);
    if (!res || res.error) {
      // Never surface the raw provider error string: it can carry server-side
      // detail or a specific reason ("account locked", "no such user") that
      // helps an attacker map registered addresses. The server already returns
      // one generic message for every failure mode; echo that shape.
      setError(
        "Sign in failed. Check your email address and password, then try again. " +
          "After five failed attempts an account is locked for 15 minutes.",
      );
      setPending(false);
      return;
    }
    // Only same-origin relative paths are accepted as a redirect target, so a
    // crafted ?callbackUrl=https://evil.example cannot be used to bounce a
    // freshly authenticated user off-site.
    const target = /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : "/portal";
    window.location.href = res.url ?? target;
  }

  return (
    <div className="mx-auto grid max-w-shell gap-8 px-5 py-14 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="eyebrow">Institutional access</p>
        <h1 className="font-display mt-2 text-4xl text-forest-950">Sign in to the Forum</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink/70">
          Members use the <strong>Member Portal</strong>; Secretariat staff use the{" "}
          <strong>Secretariat Console</strong>. Access is governed by your role — every
          protected operation is authorized server-side.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink/60">
          <li>· Sessions expire after 8 hours of inactivity.</li>
          <li>· Five failed attempts lock an account for 15 minutes.</li>
          <li>· All sign-ins are written to the immutable audit trail.</li>
        </ul>
        <p className="mt-6 text-[13px] text-ink/50">
          No account? Contact <Link href="/contact" className="font-semibold text-primary">the Secretariat</Link> for verification.
        </p>
      </div>
      <form onSubmit={onSubmit} className="h-fit border hairline bg-white p-7 shadow-card" aria-label="Sign in">
        <h2 className="font-display text-2xl text-forest-950">Member & Secretariat sign in</h2>
        {error && (
          <p role="alert" className="mt-4 border border-red-800/30 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
        )}
        <div className="mt-5">
          <label htmlFor="email" className="text-[13px] font-semibold">Email address</label>
          <input id="email" name="email" type="email" autoComplete="username" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2.5 text-sm" placeholder="you@ffdgn.org.ng" />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className="text-[13px] font-semibold">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border hairline px-4 py-2.5 text-sm" />
        </div>
        <button disabled={pending} className="mt-6 w-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60">
          {pending ? "Verifying…" : "Sign in →"}
        </button>
        <p className="mt-3 text-center text-[12.5px] text-ink/50">Protected by rate limiting and brute-force lockout.</p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-shell px-5 py-14 text-sm text-ink/60">Loading sign in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
