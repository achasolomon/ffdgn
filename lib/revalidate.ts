import { revalidatePath } from "next/cache";

/**
 * Cache invalidation for CMS writes.
 *
 * Public pages read MySQL through `lib/repo.ts` with ISR (`revalidate = 300`
 * and per-page `export const revalidate`). Without explicit invalidation an
 * editor sees their change only after the ISR window lapses, which reads as
 * "the publish button did nothing".
 *
 * Layout-scoped revalidation is used so that content appearing in more than one
 * place (homepage, section index, sitemap, header banner) is all refreshed in a
 * single call. `revalidatePath("/", "layout")` invalidates every route beneath
 * the root layout, which is what a public content edit needs.
 */
export function revalidatePublicSite(reason: string) {
  try {
    revalidatePath("/", "layout");
    console.info(`[revalidate] public site cleared after: ${reason}`);
  } catch (e) {
    // Never fail the write because cache invalidation failed — the ISR window
    // will still expire the stale content on its own.
    console.error(`[revalidate] failed for ${reason}`, e);
  }
}