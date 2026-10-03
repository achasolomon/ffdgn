import { useRouter } from "next/navigation";

/**
 * Shared helpers for admin client components.
 *
 * Imported only from "use client" components, so no directive is needed here.
 */

export type AdminResult = { data: Record<string, unknown>; meta: Record<string, unknown> };
export type Feedback = { ok: boolean; text: string } | null;

/**
 * Mutation helper for every admin form.
 *
 * A 401/403 means the operator's session changed underneath a page the router
 * had already cached, so the action genuinely did not happen. Sending them to
 * sign-in with a callback is the honest response; surfacing raw JSON instead
 * leaves staff believing an edit succeeded when it was rejected. Validation
 * messages from the API are passed through verbatim rather than reimplemented
 * here, so the client cannot drift from the server's rules.
 */
export function useAdminApi(): (
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
) => Promise<AdminResult> {
  const router = useRouter();

  return async function adminApi(url, method, body) {
    const res = await fetch(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });

    if (res.status === 401 || res.status === 403) {
      const back = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?callbackUrl=${back}`);
      throw new Error("Your session has ended. Redirecting you to sign in.");
    }

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (payload?.errors as Array<{ message?: string }> | null)?.[0]?.message ??
        `Request failed (${res.status}).`;
      throw new Error(message);
    }
    return {
      data: (payload?.data ?? {}) as Record<string, unknown>,
      meta: (payload?.meta ?? {}) as Record<string, unknown>,
    };
  };
}

/** Re-render the server component tree so a saved row appears. */
export function useAdminRefresh(): () => void {
  const router = useRouter();
  return () => router.refresh();
}

/** Shared styling for inline feedback banners. */
export function feedbackClass(ok: boolean): string {
  return ok
    ? "border-green-800/30 bg-green-50 text-green-900"
    : "border-red-800/30 bg-red-50 text-red-900";
}
