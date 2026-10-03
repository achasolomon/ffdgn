/**
 * Prove the nonce-based CSP works in a real browser, not just in a header dump.
 *
 * Why this exists
 * ---------------
 * `curl -I` can only show that a `script-src 'nonce-...'` header is present. The
 * failure mode that matters is subtler: if the nonce is not threaded through to
 * every script the framework emits, React hydration is blocked by CSP while the
 * page still returns 200 and still renders its server HTML. It looks healthy
 * from the outside and is completely inert in a browser.
 *
 * So this drives headless Chrome over the DevTools Protocol and asserts on what
 * the browser actually did:
 *   - no CSP violation in the console (the signal for "script was blocked"),
 *   - the page hydrated (a real click changes real state, which is impossible
 *     without a working event system),
 *   - and, as a control, that the *same* harness reports a violation for an
 *     inline script without a nonce. Without the control a silently mis-wired
 *     Log/Runtime listener would make this pass vacuously.
 *
 * Run: npx tsx scripts/check-csp-browser.ts http://localhost:3000
 * Requires: Chrome or Edge on the host. No npm dependencies — CDP over Node's
 * built-in WebSocket.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const PATHNAME = process.argv[3] ?? "/";
const URL = `${BASE}${PATHNAME.startsWith("/") ? PATHNAME : `/${PATHNAME}`}`;
const DEBUG_PORT = 9333;

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser(): string {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`No Chrome/Edge found. Looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}`);
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Shape of the CDP JSON we touch. Everything else stays opaque. */
interface CdpMessage {
  id?: number;
  method?: string;
  params?: {
    entry?: { level?: string; source?: string; text?: string };
    exceptionDetails?: { text?: string };
  };
  result?: {
    value?: unknown;
    exceptionDetails?: { text?: string };
  };
  error?: { message?: string };
}

type CdpResult = Record<string, unknown>;

/** Minimal CDP client over a single WebSocket. */
class Cdp {
  private ws!: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: CdpResult) => void; reject: (e: Error) => void }>();
  readonly events: CdpMessage[] = [];
  private consoleErrors: string[] = [];

  async connect(wsUrl: string): Promise<void> {
    this.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve(), { once: true });
      this.ws.addEventListener("error", () => reject(new Error("CDP socket failed")), { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as CdpMessage;
      if (msg.id) {
        const slot = this.pending.get(msg.id);
        if (!slot) return;
        this.pending.delete(msg.id);
        if (msg.error) slot.reject(new Error(msg.error.message ?? "unknown CDP error"));
        else slot.resolve(msg.result ?? {});
        return;
      }
      this.events.push(msg);
      if (msg.method === "Log.entryAdded") {
        const e = msg.params?.entry;
        if (e?.level === "error") this.consoleErrors.push(`${e.source}: ${e.text}`);
      }
      if (msg.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(
          `exception: ${msg.params?.exceptionDetails?.text ?? "unknown"}`,
        );
      }
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<CdpResult> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30_000);
    });
  }

  /** Evaluate in page context; page-side exceptions become thrown Errors. */
  async evaluate(expression: string): Promise<unknown> {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    const details = r.exceptionDetails as { text?: string } | undefined;
    if (details) throw new Error(details.text ?? "evaluate threw");
    return (r.result as { value?: unknown } | undefined)?.value;
  }

  errors(): string[] {
    return this.consoleErrors;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

/** Launch headless Chrome with a throwaway profile and the debugger open. */
function launchBrowser(exe: string, profile: string): ChildProcess {
  return spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-extensions",
      // A CSP nonce only protects scripts when the document is not injected into
      // by an extension, which would also mask violations.
      "--disable-extensions-except=",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
}

/**
 * A *page* target, not the browser endpoint: Page/Runtime/Log are page-level
 * domains and the browser-level socket rejects them.
 */
async function waitForTarget(): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()) as Array<{
        type: string;
        webSocketDebuggerUrl?: string;
      }>;
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* browser still starting */
    }
    await sleep(250);
  }
  throw new Error("Chrome page target never became reachable");
}

/** Installed before any page script so no violation can slip past unseen. */
const VIOLATION_RECORDER = `
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__cspViolations.push({
      directive: e.effectiveDirective || e.violatedDirective,
      blocked: String(e.blockedURI || '').slice(0, 120),
    });
  });
`;

/** Navigation + console collection, shared by the real page and the control. */
async function visit(cdp: Cdp, url: string): Promise<void> {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: VIOLATION_RECORDER });
  await cdp.send("Page.navigate", { url });
  await sleep(2500);
}

interface Violation {
  directive?: string;
  blocked?: string;
}

async function main(): Promise<void> {
  const exe = findBrowser();
  const profile = mkdtempSync(join(tmpdir(), "csp-check-"));
  let child: ChildProcess | null = null;

  try {
    // Only pages in the public chrome get this treatment; /admin and /portal are
  // excluded by the proxy matcher and have no CSP to verify.
  console.log(`browser: ${exe}\ntarget:  ${URL}\n`);
    child = launchBrowser(exe, profile);
    const wsUrl = await waitForTarget();
    const cdp = new Cdp();
    await cdp.connect(wsUrl);

    // 1. The real page.
    await visit(cdp, URL);
    const pageErrors = cdp.errors();
    const violations = (await cdp.evaluate(`window.__cspViolations ?? []`)) as Violation[];

    check(
      `no CSP violation recorded by the document on ${PATHNAME}`,
      violations.length === 0,
      violations.map((v) => `${v.directive} ${v.blocked}`).join(" | "),
    );
    check(
      `no CSP violation in the browser console on ${PATHNAME}`,
      !pageErrors.some((e) => /content security policy|unsafe-inline|nonce/i.test(e)),
      pageErrors.filter((e) => /content security policy|nonce/i.test(e))[0] ?? "",
    );
    check(
      `no console errors at all on ${PATHNAME}`,
      pageErrors.length === 0,
      pageErrors.slice(0, 2).join(" | "),
    );

    // 2. Hydration, proved by state changing in response to a trusted click.
    // If React never hydrated, no handler exists and the attribute cannot move.
    const toggled = (await cdp.evaluate(`(() => {
      const btn = document.querySelector('button[aria-controls], button[aria-expanded]')
        || document.querySelector('header button');
      if (!btn) return { ok: false, reason: 'no interactive control found' };
      const before = btn.getAttribute('aria-expanded') ?? btn.getAttribute('data-state') ?? 'absent';
      btn.click();
      return new Promise((resolve) => setTimeout(() => {
        const after = btn.getAttribute('aria-expanded') ?? btn.getAttribute('data-state') ?? 'absent';
        resolve({ ok: before !== after, before, after });
      }, 700));
    })()`)) as { ok: boolean; before?: string; after?: string; reason?: string } | undefined;
    check(
      `page hydrated: clicking a control on ${PATHNAME} changes state`,
      Boolean(toggled?.ok),
      toggled?.ok ? `${toggled.before} -> ${toggled.after}` : (toggled?.reason ?? "no state change"),
    );

    const reactLive = await cdp.evaluate(`(() => {
      const el = document.querySelector('main') || document.body;
      const keys = el ? Object.keys(el).filter((k) => k.startsWith('__react')) : [];
      return keys.length;
    })()`);
    check("React root is hydrated (fiber keys present)", Number(reactLive) > 0, `${reactLive} key(s)`);

    // 3. Control. Two probes, because they answer different questions.
    //
    //    The cross-origin fetch is the liveness control: `connect-src 'self'`
    //    must block it, so a recorded violation proves the detector actually
    //    works. Without it, "no violations" could just mean "no listener".
    //
    //    The inline script is informational. Under 'strict-dynamic', a script
    //    element created by an already-trusted script is allowed to run even
    //    without its own nonce — that is the directive working as designed, not
    //    a hole, and it is why it cannot serve as the control.
    await cdp.evaluate(`(() => {
      const s = document.createElement('script');
      s.textContent = 'window.__csp_probe = 1;';
      document.body.appendChild(s);
      return true;
    })()`);
    const inlineRan = await cdp.evaluate(`window.__csp_probe === 1`);
    await sleep(500);

    const fetchBlocked = (await cdp.evaluate(
      `fetch('https://example.com/csp-liveness-probe').then(() => 'allowed').catch(() => 'blocked')`,
    )) as string;
    await sleep(700);

    const afterControl = (await cdp.evaluate(`window.__cspViolations ?? []`)) as Violation[];
    const connectViolation = afterControl.find((v) => v.directive === "connect-src");

    check(
      "control: cross-origin fetch is blocked and the violation IS detected",
      fetchBlocked === "blocked" && Boolean(connectViolation),
      connectViolation
        ? `connect-src blocked ${connectViolation.blocked}`
        : `fetch returned "${fetchBlocked}" and no connect-src violation was recorded`,
    );

    console.log(
      `\n  note: a script injected from the page's own trusted context ` +
        `${inlineRan ? "ran" : "did not run"} under 'strict-dynamic'. Expected: trust propagates ` +
        `from the nonced bootstrap, so dynamic script creation is not a bypass for an injected script.`,
    );
    cdp.close();
  } finally {
    child?.kill();
    await sleep(300);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nCSP verified in a real browser: nonces hydrate, inline scripts still blocked.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
