import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { pathToFileURL } from "node:url";
import { CSV_HEADERS } from "../lib/conference/input";

export async function checkGuestBrowser(origin: string, token: string) { return runConferenceBrowser(origin, token); }
export async function checkEmailBrowser(preview: string) { return runConferenceBrowser("http://localhost", "", { eventId: "", cookie: "", emailPreview: preview }); }
export async function previewPdfBrowser(preview: string) { return runConferenceBrowser("http://localhost", "", { eventId: "", cookie: "", pdfPreview: preview }); }
export async function checkGateBrowser(origin: string, eventId: string, cookie: string, token: string) { return runConferenceBrowser(origin, token, { eventId, cookie }); }
export async function checkPrintBrowser(origin: string, eventId: string, cookie: string, printId: string) { return runConferenceBrowser(origin, "", { eventId, cookie, printId }); }
export async function checkConsoleBrowser(origin: string, cookie: string) { return runConferenceBrowser(origin, "", { eventId: "", cookie, consoleCheck: true }); }
export async function checkWalkinBrowser(origin: string, eventId: string, cookie: string) { return runConferenceBrowser(origin, "", { eventId, cookie, walkinCheck: true }); }
export async function checkStaffBrowser(origin: string, email: string, password: string, eventId: string, setupToken?: string) { return runConferenceBrowser(origin, "", { eventId, cookie: "", staffLogin: { email, password, setupToken } }); }
async function runConferenceBrowser(origin: string, token: string, gate?: { eventId: string; cookie: string; pdfPreview?: string; emailPreview?: string; printId?: string; consoleCheck?: boolean; walkinCheck?: boolean; staffLogin?: { email: string; password: string; setupToken?: string } }) {
  const browser = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
  if (!browser) throw new Error("Chrome or Edge is required for the requested browser check.");
  const testRoot = resolve(".data/conference-tools"), profile = join(testRoot, `browser-${randomUUID()}`);
  mkdirSync(profile, { recursive: true });
  const child = spawn(browser, ["--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  let socket: WebSocket | undefined;
  try {
    let debugPort = "";
    for (let attempt = 0; attempt < 100; attempt++) {
      try { debugPort = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0].trim(); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.match(debugPort, /^\d+$/);
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
    socket = new WebSocket(targets.find(target => target.type === "page")!.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket!.addEventListener("open", () => resolve(), { once: true }); socket!.addEventListener("error", () => reject(new Error("Browser connection failed.")), { once: true }); });
    let nextId = 0;
    const pending = new Map<number, { resolve: (data: Record<string, unknown>) => void; reject: (error: Error) => void }>();
    socket.addEventListener("message", event => {
      const data = JSON.parse(String(event.data));
      if (!data.id || !pending.has(data.id)) return;
      const request = pending.get(data.id)!; pending.delete(data.id); if (data.error) request.reject(new Error("Browser command failed.")); else request.resolve(data.result ?? {});
    });
    const send = (method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket!.send(JSON.stringify({ id, method, params })); });
    async function evaluate(expression: string) { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error("Browser evaluation failed."); return (result.result as { value?: unknown })?.value; }
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__invitationCsp = []; document.addEventListener('securitypolicyviolation', event => window.__invitationCsp.push(event.effectiveDirective));" });
    if (gate) {
      if (gate.pdfPreview) {
        await send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 1250, deviceScaleFactor: 1, mobile: false });
        await send("Page.navigate", { url: pathToFileURL(resolve(gate.pdfPreview)).href + "#toolbar=0&zoom=100" });
        await new Promise(resolve => setTimeout(resolve, 3000));
        const shot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, gate.pdfPreview.includes("guest-tag") ? "formal-tag-preview.png" : "formal-invitation-preview.png"), Buffer.from(shot.data as string, "base64"));
        return;
      }
      if (gate.emailPreview) {
        await send("Page.navigate", { url: pathToFileURL(resolve(gate.emailPreview)).href });
        for (let i = 0; i < 100 && !(await evaluate("!!document.querySelector('.email-shell')")); i++) await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(await evaluate("!!document.querySelector('.email-shell')"), true);
        for (const width of [900, 390, 320]) {
          await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 600 });
          assert.equal(await evaluate(`document.documentElement.scrollWidth <= ${width}`), true, "Email preview must fit desktop and phone displays.");
          const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(join(testRoot, `email-${gate.emailPreview.includes('staff-') ? 'staff' : 'guest'}-${width}.png`), Buffer.from(shot.data as string, "base64"));
        }
        console.log("Email preview browser checks passed: desktop, 390px and 320px layouts. No links opened or messages sent."); return;
      }
      if (gate.staffLogin) {
        async function waitStaff(expression: string, message: string) { for (let i = 0; i < 150; i++) { if (await evaluate(expression) === true) return; await new Promise(resolve => setTimeout(resolve, 100)); } assert.fail(message); }
        if (gate.staffLogin.setupToken) {
          await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
          await send("Page.navigate", { url: `${origin}/staff/setup#${gate.staffLogin.setupToken}` });
          await waitStaff("!!document.querySelector('input[name=password]') && !location.hash", "Staff setup must show its form and remove the private link fragment.");
          assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Staff password setup must fit a phone.");
          const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "staff-password-phone-preview.png"), Buffer.from(screenshot.data as string, "base64"));
          await evaluate(`(() => { const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; for (const name of ['password','confirm']) { const input=document.querySelector('input[name='+name+']'); setter.call(input,${JSON.stringify(gate.staffLogin.password)}); input.dispatchEvent(new Event('input',{bubbles:true})); } document.querySelector('form[aria-label="Create staff password"] button').click(); })()`);
          await waitStaff("document.body.innerText.includes('Your password is ready')", "Staff should create their own password through the phone form.");
          assert.equal(await evaluate("window.__invitationCsp.length"), 0);
        }
        await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await send("Page.navigate", { url: origin + "/login" });
        await waitStaff("!!document.querySelector('#email') && Object.keys(document.querySelector('#email')).some(key => key.startsWith('__reactProps$'))", "Staff sign-in should hydrate.");
        await evaluate(`(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; for (const [id,value] of ${JSON.stringify([["email", gate.staffLogin.email], ["password", gate.staffLogin.password]])}) { const input=document.getElementById(id); setter.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } })()`);
        await evaluate("document.querySelector('form[aria-label=\"Sign in\"] button').click()");
        await waitStaff("location.pathname === '/admin/events/operations' && !!document.querySelector('section[aria-label=\"Conference tasks\"]')", "Guest-desk staff should land directly on their assigned guest desk.");
        assert.equal(await evaluate("Array.from(document.querySelectorAll('nav[aria-label=Secretariat] a')).every(link => link.pathname === '/admin/events/operations')"), true, "Restricted staff should have no unrelated console links.");
        assert.equal(await evaluate("Array.from(document.querySelectorAll('select[name=event] option')).length"), 1, "Only the assigned event should be listed.");
        assert.equal(await evaluate("Array.from(document.querySelectorAll('section[aria-label=\"Conference tasks\"] a')).some(link => new URL(link.href).searchParams.get('view') === 'settings')"), false);
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Restricted staff guest desk must fit a phone.");
        await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "guest-desk-staff-preview.png"), Buffer.from(screenshot.data as string, "base64"));
        await send("Page.navigate", { url: origin + '/admin/events/operations?view=account' });
        await waitStaff("!!document.querySelector('#cp-cur')", "Restricted staff should have their own password form.");
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true);
        console.log("Restricted staff browser checks passed: real sign-in, direct guest-desk landing, assigned event only, limited sidebar/tasks and own password screen.");
        return;
      }
      const cookieValue = gate.cookie.slice(gate.cookie.indexOf("=") + 1);
      await send("Network.setCookie", { name: "next-auth.session-token", value: cookieValue, url: origin, httpOnly: true, sameSite: "Lax" });
      if (gate.walkinCheck) {
        async function waitWalkin(expression: string, message: string) { for (let i = 0; i < 150; i++) { if (await evaluate(expression) === true) return; await new Promise(resolve => setTimeout(resolve, 100)); } assert.fail(message); }
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await send("Page.navigate", { url: `${origin}/admin/events/operations?event=${gate.eventId}&view=register` });
        await waitWalkin("Array.from(document.querySelectorAll('section[aria-label=\"Walk-in registration\"] button')).some(button => Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Walk-in form should hydrate.");
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Registration screen must fit a phone.");
        assert.equal(await evaluate("!!document.querySelector('input[type=file]')"), false, "Imports and settings must not crowd the registration task.");
        await evaluate("(() => { const form = document.querySelector('section[aria-label=\"Walk-in registration\"] form'); form.elements.fullName.value = 'Browser Walk-in Guest'; form.elements.organization.value = 'Test Forum'; form.querySelector('button').click(); })()");
        await waitWalkin("!!document.querySelector('section[aria-label=\"Walk-in registration\"] a')", "Walk-in registration should offer its QR tag print page.");
        const printPath = await evaluate("document.querySelector('section[aria-label=\"Walk-in registration\"] a').getAttribute('href')") as string;
        assert.ok(printPath.startsWith('/admin/events/print?'));
        await send("Page.navigate", { url: `${origin}/admin/events/operations?event=${gate.eventId}&view=guests&q=Browser%20Walk-in%20Guest` });
        await waitWalkin("Array.from(document.querySelectorAll('tbody button')).some(button => button.textContent === 'Print tag' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Guest search should offer a direct print action.");
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Guest cards must fit a phone.");
        const directoryPhone = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(join(testRoot, "guest-directory-phone.png"), Buffer.from(directoryPhone.data as string, "base64"));
        await evaluate("Array.from(document.querySelectorAll('tbody button')).find(button => button.textContent === 'Print tag').click()");
        await waitWalkin("Array.from(document.querySelectorAll('dialog[open] a')).some(link => link.getAttribute('href') === " + JSON.stringify(printPath) + ")", "Guest card should reopen its existing tag without creating another one.");
        const drawerShot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "guest-tag-drawer-phone.png"), Buffer.from(drawerShot.data as string, "base64"));
        await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1100, deviceScaleFactor: 1, mobile: false });
        await send("Page.navigate", { url: origin + printPath });
        await waitWalkin("document.querySelector('.badge-artwork')?.complete && document.querySelector('.badge-artwork')?.naturalWidth > 0", "Tag must display its printable QR.");
        assert.equal(await evaluate("document.querySelector('.badge-artwork').alt.includes('Browser Walk-in Guest')"), true);
        await send("Emulation.setEmulatedMedia", { media: "print" });
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.badge-artwork')).visibility"), "visible");
        const output = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
        const pdfBytes = Buffer.from(output.data as string, "base64"), pdf = await PDFDocument.load(pdfBytes);
        assert.equal(pdf.getPageCount(), 1); assert.ok(Math.abs(pdf.getPage(0).getWidth() - 283.465) < 1); assert.ok(Math.abs(pdf.getPage(0).getHeight() - 396.85) < 1);
        writeFileSync(join(testRoot, "walkin-qr-tag-preview.pdf"), pdfBytes);
        await send("Emulation.setEmulatedMedia", { media: "screen" });
        const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "walkin-qr-tag-preview.png"), Buffer.from(screenshot.data as string, "base64"));
        console.log("Walk-in browser checks passed: staff registration without email, print link, guest details and visible QR on one 100 × 140 mm page.");
        return;
      }
      if (gate.consoleCheck) {
        await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        async function waitConsole(expression: string, message: string) { for (let i = 0; i < 150; i++) { if (await evaluate(expression) === true) return; await new Promise(resolve => setTimeout(resolve, 200)); } assert.fail(message); }
        await send("Page.navigate", { url: `${origin}/admin` });
        await waitConsole("document.body?.innerText.includes('Operations overview')", "Console overview should open.");
        await waitConsole("Array.from(document.querySelectorAll('nav[aria-label=Secretariat] a')).some(link => link.pathname === '/admin/events/operations' && link.offsetWidth > 0 && link.offsetHeight > 0)", "Conference operations must be visible in the desktop sidebar.");
        assert.equal(await evaluate("Array.from(document.querySelectorAll('section[aria-label=\"Conference guest desk\"] a')).some(link => link.pathname === '/admin/events/operations')"), true);
        await send("Page.navigate", { url: `${origin}/admin/events/operations` });
        await waitConsole("!!document.querySelector('section[aria-label=\"Conference tasks\"]')", "Guest desk should open with its task menu.");
        assert.equal(await evaluate("!!document.querySelector('section[aria-label=\"Walk-in registration\"]') || !!document.querySelector('input[type=file]')"), false, "The task menu must not display competing registration or import forms.");
        assert.equal(await evaluate("document.querySelector('nav[aria-label=Secretariat] a[aria-current=page]')?.pathname"), "/admin/events/operations");
        const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "console-conference-preview.png"), Buffer.from(screenshot.data as string, "base64"));
        const settingsHref = await evaluate("Array.from(document.querySelectorAll('section[aria-label=\"Conference tasks\"] a')).find(link => new URL(link.href).searchParams.get('view') === 'settings').getAttribute('href')") as string;
        await send("Page.navigate", { url: origin + settingsHref });
        await waitConsole("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Registration & entry settings' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Settings actions should hydrate.");
        assert.equal(await evaluate("!!document.querySelector('input[name=enabled]')"), false, "Long settings forms must stay off the main page.");
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Registration & entry settings').click()");
        await waitConsole("!!document.querySelector('dialog[open] input[name=enabled]')", "Event settings must open in a dialog.");
        await waitConsole("Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().right - innerWidth) < 2 && document.querySelector('dialog[open]').getBoundingClientRect().top === 0", "Conference tasks must open as right-side drawers.");
        await evaluate("document.querySelector('dialog[open] button[aria-label]').click()");
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await send("Page.navigate", { url: origin + settingsHref.replace('view=settings', 'view=guests') + '&q=Guest' });
        await waitConsole("!!document.querySelector('input[name=q]')", "Guest search should open.");
        assert.equal(await evaluate("document.querySelector('input[name=q]').getBoundingClientRect().width > 200"), true, "Phone search must retain a useful width when Clear search is present.");
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await send("Page.navigate", { url: origin + settingsHref.replace('view=settings', 'view=upload') });
        await waitConsole("!!document.querySelector('section[aria-label=\"Invited guest upload\"] input[type=file]')", "The redesigned upload workspace should open.");
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Upload workspace should fit a phone.");
        const uploadShot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(join(testRoot, "invited-upload-phone.png"), Buffer.from(uploadShot.data as string, "base64"));
        if (new URL(origin).port === "3119") {
          const csv = CSV_HEADERS.join(",") + "\r\nDrawer Upload Guest,drawer-upload@conference.test,,Test Forum,Chair,VIP,Existing invitation\r\n";
          await evaluate(`(() => { const input = document.querySelector('input[type=file]'), transfer = new DataTransfer(); transfer.items.add(new File([${JSON.stringify(csv)}], 'invited-guests.csv', {type:'text/csv'})); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
          await waitConsole("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Check guest list' && !button.disabled)", "A selected CSV should enable validation.");
          await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Check guest list').click()");
          await waitConsole("!!document.querySelector('section[aria-label=\"Guest list review\"]') && document.body.innerText.includes('Guest list ready')", "Valid guests should appear in the review workspace.");
          assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Add these guests' && !button.disabled)"), true);
        }
        await waitConsole("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Add one invited guest' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Single-guest drawer should hydrate.");
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Add one invited guest').click()");
        await waitConsole("!!document.querySelector('dialog[open] input[name=fullName]')", "Adding one invited guest should use a drawer.");
        assert.equal(await evaluate("document.querySelector('dialog[open]').getBoundingClientRect().width <= 391"), true);
        await evaluate("document.querySelector('dialog[open] button[aria-label]').click()");
        await send("Page.navigate", { url: origin + settingsHref });
        await waitConsole("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Invite a staff member' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Staff actions should hydrate.");
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Invite a staff member').click()");
        await waitConsole("!!document.querySelector('dialog[open] input[type=email]')", "Staff invitation must open in a dialog.");
        assert.equal(await evaluate("!!document.querySelector('section[aria-label=\"Create guest desk staff\"] input[type=email]') && !document.querySelector('section[aria-label=\"Create guest desk staff\"] input[type=password]') && document.querySelector('section[aria-label=\"Create guest desk staff\"] select')?.options.length === 4"), true, "Administrators must see the invitation form and its four duties without choosing the staff password.");
        assert.equal(await evaluate("!!document.querySelector('section[aria-label=\"Walk-in registration\"]') || !!document.querySelector('input[type=file]')"), false);
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Settings must fit a phone.");
        assert.equal(await evaluate("document.querySelector('dialog[open]').getBoundingClientRect().width <= 391"), true);
        await evaluate("document.querySelector('dialog[open] button[aria-label]').click()");
        console.log("Console browser checks passed: desktop navigation, overview link, clear task menu, separate settings and phone layout. No event settings or guest records changed.");
        return;
      }
      if (gate.printId) {
        await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.__printCalls = 0; window.print = () => { window.__printCalls++; window.dispatchEvent(new Event('afterprint')); };" });
        await send("Page.navigate", { url: `${origin}/admin/events/print?event=${gate.eventId}&id=${gate.printId}` });
        for (let i = 0; i < 100 && !(await evaluate("document.querySelector('.badge-artwork')?.naturalWidth > 0")); i++) await new Promise(resolve => setTimeout(resolve, 100));
        assert.equal(await evaluate("document.querySelector('.badge-artwork')?.naturalWidth > 0"), true, "The official logo must load before printing.");
        async function waitPrint(expression: string, message: string) { for (let i = 0; i < 150; i++) { if (await evaluate(expression) === true) return; await new Promise(resolve => setTimeout(resolve, 100)); } assert.fail(message); }
        await waitPrint("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Print tag' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Print controls should hydrate.");
        assert.equal(await evaluate("document.body.innerText.includes('Secretariat')"), false, "Print page should not include console chrome.");
        assert.equal(await evaluate("!!document.querySelector('.badge-controls ol') || !!document.querySelector('.badge-controls details')"), false, "Only tag actions should appear above the tag, without instructions or printer settings.");
        for (const width of [390, 320]) {
          await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
          assert.equal(await evaluate(`document.documentElement.scrollWidth <= ${width}`), true, "The tag and actions must fit a phone.");
          assert.equal(await evaluate("document.querySelector('.badge-controls').getBoundingClientRect().bottom <= document.querySelector('.badge-sheet').getBoundingClientRect().top"), true, "Actions must stay above the tag.");
          const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(join(testRoot, `badge-phone-${width}.png`), Buffer.from(shot.data as string, "base64"));
        }
        await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Print tag').click()");
        await waitPrint("window.__printCalls === 1 && document.body.innerText.includes('Did the tag print correctly?')", "Print control should validate state and invoke the dialog.");
        const printState = await evaluate(`fetch(${JSON.stringify(`/api/v1/conference/events/${gate.eventId}/prints?id=${gate.printId}`)}).then(response => response.json()).then(data => data.data.state)`); assert.equal(printState, "Prepared", "Dialog/afterprint events cannot confirm physical printing.");
        await send("Emulation.setEmulatedMedia", { media: "print" });
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.badge-controls')).display"), "none");
        const output = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
        const pdfBytes = Buffer.from(output.data as string, "base64"), pdf = await PDFDocument.load(pdfBytes);
        assert.equal(pdf.getPageCount(), 1, "Browser output must contain exactly one badge, without blank/duplicate pages."); assert.ok(Math.abs(pdf.getPage(0).getWidth() - 283.465) < 1); assert.ok(Math.abs(pdf.getPage(0).getHeight() - 396.85) < 1);
        writeFileSync(join(testRoot, "browser-badge.pdf"), pdfBytes);
        await send("Emulation.setEmulatedMedia", { media: "screen" });
        const preview = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(join(testRoot, "badge-print-preview.png"), Buffer.from(preview.data as string, "base64"));
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Tag printed successfully').click()");
        await waitPrint("document.body.innerText.includes('Printing recorded.')", "Collection confirmation should save through the API.");
        assert.deepEqual(await evaluate("window.__invitationCsp"), []);
        await send("Page.navigate", { url: `${origin}/admin/events/reports?event=${gate.eventId}` });
        await waitPrint("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Download guest list' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Report controls should hydrate.");
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Replies & tag history').click()");
        await waitPrint("!!document.querySelector('dialog[open]')", "Report history should open in a dialog.");
        assert.equal(await evaluate("document.querySelector('dialog[open]').innerText.includes('prints confirmed by staff')"), true);
        await evaluate("document.querySelector('dialog[open] button[aria-label]').click()");
        await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Report page should fit a phone viewport.");
        const reportShot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "attendance-report-preview.png"), Buffer.from(reportShot.data as string, "base64"));
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Filters').click()");
        await waitPrint("!!document.querySelector('dialog[open] select[name=attendance]')", "Report filters should open in a dialog.");
        assert.equal(await evaluate("document.querySelector('dialog[open]').getBoundingClientRect().width <= 391"), true);
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await waitPrint("!document.querySelector('dialog[open]') && document.activeElement.textContent === 'Filters'", "Escape should close the dialog and restore focus.");
        await send("Page.navigate", { url: `${origin}/admin/events/operations?event=${gate.eventId}&view=guests` });
        await waitPrint("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Print tag' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Guest tag actions should hydrate.");
        await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Print tag').click()");
        await waitPrint("!!document.querySelector('dialog[open] section') && document.querySelector('dialog[open]').innerText.includes('Guest tag')", "Selected guest tags should open in a dialog.");
        assert.equal(await evaluate("document.querySelector('dialog[open]').getBoundingClientRect().width <= 391"), true);
        await evaluate("document.querySelector('dialog[open] button[aria-label]').click()");
        console.log("Print/report browser checks passed: dialog state revalidation, explicit collection confirmation, one-page 100 × 140 mm browser PDF, print-only layout, font/CSP and reporting phone layout.");
        return;
      }
      const qr = await QRCode.toDataURL(token, { width: 640, margin: 4 });
      // A deterministic camera stream exercises the actual canvas decoder without hardware.
      await send("Page.addScriptToEvaluateOnNewDocument", { source: `navigator.mediaDevices.getUserMedia = async () => { const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 640; const image = new Image(); image.src = ${JSON.stringify(qr)}; await image.decode(); const stream = canvas.captureStream(4); const interval = setInterval(() => { if (stream.getTracks().every(track => track.readyState === 'ended')) clearInterval(interval); else canvas.getContext('2d').drawImage(image,0,0); }, 100); window.__gateCameraStream = stream; return stream; };` });
      await send("Page.navigate", { url: `${origin}/admin/events/gate?event=${gate.eventId}` });
      async function waitFor(expression: string, message: string) { for (let attempt = 0; attempt < 150; attempt++) { if (await evaluate(expression) === true) return; await new Promise(resolve => setTimeout(resolve, 100)); } console.error("Gate browser diagnostics:", await evaluate("JSON.stringify({ text: document.body.innerText, video: document.querySelector('video') ? { width: document.querySelector('video').videoWidth, height: document.querySelector('video').videoHeight, ready: document.querySelector('video').readyState } : null, csp: window.__invitationCsp, camera: window.__gateCameraStream?.getTracks().map(track => track.readyState) })")); assert.fail(message); }
      await waitFor("document.body?.innerText.includes('Scan the guest’s QR')", "Gate page should open for assigned staff.");
      await waitFor("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Scan QR with camera' && Object.keys(button).some(key => key.startsWith('__reactProps$')))", "Gate controls should hydrate before camera interaction.");
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.equal(await evaluate("Array.from(document.querySelector('[aria-label=\"Gate actions\"]').querySelectorAll('button')).every(button => { const bounds=button.getBoundingClientRect(); return bounds.top>=0 && bounds.bottom<844; })"), true, "All gate task buttons must be visible without scrolling on a phone.");
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Find guest').click()");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Find a guest') === true", "Guest lookup should open in a side drawer.");
      await evaluate("document.querySelector('dialog[open] button[aria-label=\"Close Find a guest\"]').click()");
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Scan QR with camera').click()");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Gate Guest') === true", "Camera QR decoder should verify the invited guest.");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Guest verified') === true", "A successful scan should open a clear verified guest modal.");
      assert.equal(await evaluate("window.__gateCameraStream.getTracks().every(track => track.readyState === 'ended')"), true);
      await evaluate("Array.from(document.querySelectorAll('dialog[open] button')).find(button => button.textContent === 'Confirm guest entry').click()");
      await waitFor("document.body.innerText.includes('Guest checked in.')", "Confirm admission must create a real admission.");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Guest checked in successfully') === true", "Recorded admission should show a success modal.");
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Next guest').click()");
      await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Scan QR with camera').click()");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Gate Guest') === true", "Repeated scan must find the existing admission.");
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Already checked in') === true", "Repeated scans must show the duplicate entry result in the modal.");
      assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Confirm guest entry')"), false);
      await evaluate("navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Scan QR with camera').click()");
      await waitFor("document.body.innerText.includes('Camera access is blocked.')", "Denied permission should show actionable camera guidance.");
      assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Scan QR with camera').disabled"), false);
      await evaluate(`(() => { const bytes = Uint8Array.from(atob(${JSON.stringify(qr.split(",")[1])}), character => character.charCodeAt(0)); const files = new DataTransfer(); files.items.add(new File([bytes], 'guest-qr.png', { type: 'image/png' })); const input = document.querySelector('input[type=file]'); input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await waitFor("document.querySelector('dialog[open]')?.innerText.includes('Gate Guest') === true", "QR photo fallback should verify the guest after camera permission is denied.");
      assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Confirm guest entry')"), false);
      assert.equal(await evaluate("location.search.includes('ffdgn1_') || location.hash.includes('ffdgn1_')"), false);
      assert.equal(await evaluate("document.permissionsPolicy ? document.permissionsPolicy.allowsFeature('camera') : document.featurePolicy.allowsFeature('camera')"), true);
      assert.deepEqual(await evaluate("window.__invitationCsp"), []);
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Gate page must fit a phone viewport.");
      const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "gate-preview.png"), Buffer.from(screenshot.data as string, "base64"));
      console.log("Gate browser checks passed: QR camera decoding, camera release, denied-permission recovery, QR photo fallback, hydrated admission, repeated scan prevention, private credential handling, camera permission/CSP and phone layout.");
      return;
    }
    await send("Page.navigate", { url: `${origin}/invite#${token}` });
    let opened = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      opened = await evaluate("document.body?.innerText.includes('Will you attend?')") === true;
      if (opened) break; await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(opened, "Guest invitation should open without login in the browser.");
    assert.equal(await evaluate("location.hash"), "", "Invitation token must leave the address bar.");
    await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'I will attend').click()");
    let confirmed = false;
    for (let attempt = 0; attempt < 100; attempt++) { confirmed = await evaluate("document.body.innerText.includes('Your attendance is confirmed')") === true; if (confirmed) break; await new Promise(resolve => setTimeout(resolve, 100)); }
    assert.ok(confirmed, "Hydrated RSVP controls must save and show confirmation.");
    assert.equal(await evaluate("document.querySelector('img').complete && document.querySelector('img').naturalWidth > 0"), true);
    assert.deepEqual(await evaluate("window.__invitationCsp"), []);
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate("document.documentElement.scrollWidth <= 390"), true, "Guest page should fit a phone viewport.");
    const screenshot = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(testRoot, "invitation-preview.png"), Buffer.from(screenshot.data as string, "base64"));
    console.log("Guest browser checks passed: fragment exchange/removal, account-free RSVP interaction, QR loading, CSP and phone layout.");
  } finally {
    socket?.close(); child.kill();
    await new Promise<void>(resolve => { if (child.exitCode !== null) resolve(); else { child.once("exit", () => resolve()); setTimeout(resolve, 3000).unref(); } });
    const target = resolve(profile); assert.ok(target.startsWith(testRoot + sep) && target !== testRoot);
    try { rmSync(target, { recursive: true, force: true }); } catch { /* Browser may briefly retain its profile handles. */ }
  }
}
