/**
 * Assert every internal href the site can emit actually resolves.
 *
 * Why this exists
 * ---------------
 * `typedRoutes` catches a *typo* — a path that was never a route. It cannot
 * catch a path that was a real route and then stopped being one, nor a route
 * that was renamed on disk while a nav entry kept the old slug. That is exactly
 * how the conference banner came to point at a 404: the destination was
 * hand-typed in two places, one of which drifted.
 *
 * So this reads the same link lists the chrome renders (lib/routes.ts) and
 * checks each one against a running server. It does not crawl: an exhaustive
 * crawler is `smoke-test.ts`'s job, and this is the fast gate that runs inside
 * `npm run check` before a build.
 *
 * Run: npx tsx scripts/check-links.ts [base-url]
 *
 * With no argument it boots `next start` on port 3000 if nothing is listening,
 * and shuts it down afterwards. It cannot use a different port for the child
 * than for its own probes: probing one port while the server listens on another
 * is how an earlier version of this script "started a server" and then reported
 * every single link as broken.
 *
 * An explicit argument is taken at face value and never auto-started, because a
 * passed URL is normally a staging deployment the operator wants inspected.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { chromeLinks, STATIC_ROUTES } from "@/lib/routes";

const ARG = process.argv[2]?.replace(/\/$/, "");
const BASE = ARG ?? "http://localhost:3000";
const PORT = Number(new URL(BASE).port || (new URL(BASE).protocol === "https:" ? 443 : 80));

/**
 * Split an href into what the server answers on and what the browser resolves
 * after load.
 *
 * The fragment is kept rather than discarded because an `#anchor` that matches
 * nothing is a real failure: the page returns 200 and the browser scrolls
 * nowhere, so the only symptom is a search result that appears to do nothing.
 */
function splitHref(href: string): { path: string; query: string; fragment: string } {
  const [pathAndQuery = "/", fragment = ""] = href.split("#");
  const [path = "/", query = ""] = pathAndQuery.split("?");
  return { path, query, fragment };
}

/**
 * Does this page actually contain the anchor?
 *
 * Deliberately a substring test rather than an HTML parse: the only anchors the
 * site emits are `id="<slug>"` on `<article>` elements, and a false positive here
 * means missing a real element, which is a far cheaper error than pulling in a
 * parser for one attribute.
 */
async function fragmentExists(url: string, fragment: string): Promise<boolean> {
  const html = await fetch(url, { signal: AbortSignal.timeout(20_000) }).then((r) => r.text());
  const decoded = decodeURIComponent(fragment);
  return (
    html.includes(`id="${decoded}"`) ||
    html.includes(`id='${decoded}'`) ||
    html.includes(`id=${decoded} `) ||
    html.includes(`id=${decoded}\n`)
  );
}

/**
 * How many `<h1>` does this document have?
 *
 * A page with none has no accessible name for its main region and no document
 * title for assistive tech to jump to; a page with several is a broken heading
 * outline. Both happen silently and neither shows up as a failed request, so
 * they are asserted here on the HTML already fetched below.
 */
function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) ?? []).length;
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function reachable(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/healthz`, {
      redirect: "manual",
      signal: AbortSignal.timeout(3_000),
    });
    // Any answer means something is listening. healthz answers 503 when MySQL is
    // down, and a link check must still run against seeded content in that case.
    return res.status > 0;
  } catch {
    return false;
  }
}

/**
 * Boot a server only when no base URL was given and nothing is listening.
 * The child listens on PORT — the same port BASE points at.
 */
async function ensureServer(): Promise<ChildProcess | null> {
  if (await reachable(BASE)) return null;
  if (ARG) {
    throw new Error(
      `No server responding at ${BASE}. Start it first, or omit the argument to boot one.`,
    );
  }

  console.log(`no server on ${BASE}; starting one for the duration of the check\n`);
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    stdio: "ignore",
    windowsHide: true,
    shell: true,
  });

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
    if (await reachable(BASE)) return child;
  }
  child.kill();
  throw new Error("server never became reachable — run `npm run build` first, since `next start` serves an existing build");
}

async function main(): Promise<void> {
  const child = await ensureServer();

  try {
    console.log(`checking links against ${BASE}\n`);

    // 1. Every href in the shared chrome lists.
    const links = chromeLinks();
    console.log(`chrome links (${links.length})`);
    for (const href of links) {
      const { path, query, fragment } = splitHref(href);
      const url = query ? `${BASE}${path}?${query}` : `${BASE}${path}`;
      let status = 0;
      try {
        const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
        status = res.status;
      } catch (err) {
        check(`${href} responds`, false, err instanceof Error ? err.message : String(err));
        continue;
      }
      // 308 from the proxy is legitimate for a private surface; a redirect to
      // /login is not a failure but is not a live page either.
      const ok = status === 200 || status === 308;
      check(`${href}`, ok, ok ? (status === 308 ? "guarded by proxy" : "") : `HTTP ${status}`);

      // A guarded route cannot be inspected without a session, so the anchor
      // check is skipped rather than reported as a false failure.
      if (fragment && status === 200) {
        try {
          const present = await fragmentExists(url, fragment);
          check(`${href} anchor #${fragment} exists`, present, present ? "" : "no matching id in the page");
        } catch (err) {
          check(`${href} anchor #${fragment}`, false, err instanceof Error ? err.message : String(err));
        }
      }
    }

    // 2. The sitemap's static list, which is the thing search engines crawl.
    //    Each 200 body is reused for the heading assertion below.
    const pageBodies = new Map<string, string>();
    console.log(`\nstatic routes (${STATIC_ROUTES.length})`);
    for (const path of STATIC_ROUTES) {
      let status = 0;
      let html = "";
      try {
        const res = await fetch(`${BASE}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
        status = res.status;
        if (status === 200) html = await res.text();
      } catch (err) {
        check(`${path} responds`, false, err instanceof Error ? err.message : String(err));
        continue;
      }
      check(`${path}`, status === 200, status === 200 ? "" : `HTTP ${status}`);
      if (status === 200) pageBodies.set(path, html);
    }

    // 3. The sitemap must actually be well-formed XML, and must not contain a
    //    URL that 404s. MetadataRoute.Sitemap is machine-generated, but it is
    //    assembled from DB rows, and a row with a bad slug is exactly the
    //    failure mode a link checker would otherwise miss.
    console.log("\nsitemap.xml");
    const sitemapRes = await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(20_000) });
    check("sitemap.xml serves 200", sitemapRes.status === 200, `got ${sitemapRes.status}`);
    const xml = sitemapRes.ok ? await sitemapRes.text() : "";
    check("sitemap.xml is a urlset", xml.includes("<urlset"), xml.slice(0, 60));
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    check("sitemap lists entries", locs.length > 0, `${locs.length} url(s)`);

    /*
     * Sitemap entries are absolute URLs against the canonical origin, so they
     * are rebased onto BASE before probing. Without this the checker would test
     * `https://ffdgn.org.ng/...` — i.e. the production host, not the build under
     * test — and report every entry as a 404. The origin is what we are
     * deliberately not testing here; the path is.
     */
    const basePath = new URL(BASE).pathname.replace(/\/$/, "");
    const rebased = locs.map((loc) => {
      try {
        return { loc, path: new URL(loc).pathname };
      } catch {
        // A <loc> that is not a URL is malformed, not a path — record it so the
        // static-list filter below does not quietly treat it as dynamic.
        return { loc, path: loc };
      }
    });
    const staticSet = new Set(STATIC_ROUTES.map((p) => `${basePath}${p}`));
    const dynamic = rebased.filter((r) => !staticSet.has(r.path));
    check(
      "sitemap entries use the canonical https origin",
      locs.every((l) => l.startsWith("https://")),
      locs.find((l) => !l.startsWith("https://")) ?? "",
    );

    let broken = 0;
    const probe = dynamic.slice(0, 60);
    for (const { loc, path } of probe) {
      const url = `${BASE}${path}`;
      try {
        const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
        if (res.status !== 200) {
          broken++;
          console.log(`  FAIL  sitemap entry ${loc} -> HTTP ${res.status}`);
        } else {
          pageBodies.set(path, await res.text());
        }
      } catch (err) {
        broken++;
        console.log(`  FAIL  sitemap entry ${loc} -> ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    check(
      `sitemap DB entries all resolve (${dynamic.length} checked, ${probe.length} probed)`,
      broken === 0,
      broken ? `${broken} broken` : "",
    );

    // 4. Every page we actually fetched has exactly one `<h1>`.
    console.log(`\npage headings (${pageBodies.size} pages)`);
    const badHeadings: string[] = [];
    for (const [path, html] of pageBodies) {
      const n = countH1(html);
      if (n !== 1) badHeadings.push(`${path} (${n})`);
    }
    check(
      "every page has exactly one <h1>",
      badHeadings.length === 0,
      badHeadings.length ? badHeadings.join(", ") : "",
    );

    if (failures > 0) {
      console.error(`\n${failures} link check(s) failed`);
      process.exitCode = 1;
      return;
    }
    console.log("\nAll internal links resolve and every page has one <h1>.");
  } finally {
    child?.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
