"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ConferenceBadgePrintTools } from "./conference-badge-print-tools";
import { ConferenceDrawer } from "./conference-drawer";
import { ConferenceGateResult } from "./conference-gate-result";
import { cameraErrorMessage } from "@/lib/conference/camera";

type Guest = { id: string; fullName: string; email: string; organization: string; jobTitle: string; category: string; rsvp: string; blocked: string | null; eligible: boolean; admission: { id: string; at: string; actorName: string; method: string } | null; alreadyAdmitted?: boolean };
const action = "min-h-12 rounded-lg border px-3 py-3 text-sm font-semibold text-forest-900 disabled:opacity-40";
const button = "rounded-lg border border-forest-900 px-5 py-3 text-base font-semibold disabled:opacity-50";
export function ConferenceGate({ eventId }: { eventId: string }) {
  const [lookupOpen, setLookupOpen] = useState(false), [readerOpen, setReaderOpen] = useState(false), [detailsOpen, setDetailsOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const base = `/api/v1/conference/events/${encodeURIComponent(eventId)}/gate`;
  const [token, setToken] = useState(""), [q, setQ] = useState(""), [reason, setReason] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null), [matches, setMatches] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [camera, setCamera] = useState(false);
  const [resultOpen, setResultOpen] = useState(false), [checkedIn, setCheckedIn] = useState(false);
  const [credential, setCredential] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]), [cameraId, setCameraId] = useState(""), [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false), mounted = useRef(true), cameraRun = useRef(0);
  function stopCamera() { cameraRun.current++; startingRef.current = false; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (timer.current) clearTimeout(timer.current); timer.current = null; if (video.current) video.current.srcObject = null; setStarting(false); setCamera(false); }
  useEffect(() => { mounted.current = true; const hidden = () => { if (document.hidden) stopCamera(); }; document.addEventListener("visibilitychange", hidden); return () => { mounted.current = false; cameraRun.current++; document.removeEventListener("visibilitychange", hidden); stream.current?.getTracks().forEach(track => track.stop()); if (timer.current) clearTimeout(timer.current); }; }, []);
  async function request(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, { method: body ? "POST" : "GET", cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); if (!response.ok) throw new Error(data.errors?.[0]?.message ?? "Gate request failed."); return data.data;
  }
  async function run(work: () => Promise<void>) {
    if (pending.current) return; pending.current = true; setBusy(true); setMessage("");
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed. Retry when connected."); } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  async function verify(value: string) {
    stopCamera(); setGuest(null); setMatches([]); setReason(""); setCredential(null); setToken("");
    await run(async () => { const result = await request(base, { action: "verify", token: value.trim() }); setCredential(value.trim()); setGuest(result); setCheckedIn(false); setResultOpen(true); });
  }
  async function startCamera(deviceId = cameraId) {
    if (startingRef.current) return;
    if (!window.isSecureContext) { setMessage("Live scanning needs the HTTPS event website. A phone cannot open its camera from an HTTP local-network address. Open the secure website, or choose a QR photo below."); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setMessage("This browser cannot open a live camera. Open the page directly in Chrome, Edge or Safari, or choose a QR photo below."); return; }
    const policy = (document as Document & { permissionsPolicy?: { allowsFeature: (feature: string) => boolean } }).permissionsPolicy;
    if (policy && !policy.allowsFeature("camera")) { setMessage("Camera access is disabled for this page. Ask your administrator to enable camera permissions for the gate screen."); return; }
    stopCamera(); startingRef.current = true; const generation = cameraRun.current; setStarting(true); setCamera(true); setMessage(""); setGuest(null); setCredential(null); setMatches([]);
    try {
      let media: MediaStream;
      try { media = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
      catch (error) {
        if (!mounted.current || generation !== cameraRun.current) throw error;
        if (error instanceof Error && ["OverconstrainedError", "NotFoundError"].includes(error.name)) media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        else if (error instanceof Error && error.name === "NotReadableError" && !deviceId && navigator.mediaDevices.enumerateDevices) {
          const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === "videoinput");
          setCameras(devices);
          const alternate = devices.find(device => /back|rear|hd camera|webcam/i.test(device.label) && !/infrared|ir camera/i.test(device.label)) ?? devices[1];
          if (!alternate) throw error;
          media = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: alternate.deviceId } }, audio: false });
        } else throw error;
      }
      if (!mounted.current || generation !== cameraRun.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (!video.current) throw new Error("Camera preview unavailable.");
      const preview = video.current; preview.muted = true; preview.autoplay = true; preview.setAttribute("playsinline", ""); preview.srcObject = media; await preview.play();
      if (!mounted.current || generation !== cameraRun.current) return;
      startingRef.current = false; setStarting(false);
      try { if (navigator.mediaDevices.enumerateDevices) { const devices = await navigator.mediaDevices.enumerateDevices(); if (mounted.current && generation === cameraRun.current) { setCameras(devices.filter(device => device.kind === "videoinput")); setCameraId(media.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId); } } } catch { /* Scanning still works if the browser hides its device list. */ }
      const canvas = document.createElement("canvas"), context = canvas.getContext("2d", { willReadFrequently: true });
      function scan() {
        if (!mounted.current || generation !== cameraRun.current || !stream.current || !video.current || !context) return;
        const width = Math.min(800, video.current.videoWidth), height = Math.round(video.current.videoHeight * width / Math.max(1, video.current.videoWidth));
        if (width && height) {
          canvas.width = width; canvas.height = height; context.drawImage(video.current, 0, 0, width, height);
          const pixels = context.getImageData(0, 0, width, height), decoded = jsQR(pixels.data, width, height);
          if (decoded?.data && /^ffdgn1_[A-Za-z0-9_-]{43}$/.test(decoded.data)) { void verify(decoded.data); return; }
        }
        timer.current = setTimeout(scan, 250);
      }
      scan();
    } catch (error) { if (mounted.current && generation === cameraRun.current) { stopCamera(); setMessage(cameraErrorMessage(error)); } }
  }
  async function scanPhoto(file?: File) {
    if (!file) return; stopCamera(); setGuest(null); setMatches([]); setReason(""); setCredential(null); setToken("");
    if (file.size > 12 * 1024 * 1024) { setMessage("Choose a photo smaller than 12 MB."); return; }
    if (!file.type.startsWith("image/")) { setMessage("Choose a QR photo or screenshot."); return; }
    await run(async () => {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement("canvas"), scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight)); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Could not read this photo. Try live scanning.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height); const pixels = context.getImageData(0, 0, canvas.width, canvas.height), decoded = jsQR(pixels.data, canvas.width, canvas.height);
        if (!decoded?.data || !/^ffdgn1_[A-Za-z0-9_-]{43}$/.test(decoded.data)) throw new Error("No guest QR found. Choose a clear, close photo of the complete QR.");
        setGuest(null); setMatches([]); setReason(""); setCredential(null); setToken(""); const result = await request(base, { action: "verify", token: decoded.data }); setCredential(decoded.data); setGuest(result); setCheckedIn(false); setResultOpen(true);
      } finally { URL.revokeObjectURL(url); }
    });
  }
  function nextGuest() { setDetailsOpen(false); setLookupOpen(false); setReaderOpen(false); setResultOpen(false); setGuest(null); setToken(""); setReason(""); setMessage(""); setCredential(null); }
  async function confirmGuest() { if (!guest) return; stopCamera(); await run(async () => { const result = await request(base, { action: "admit", ...(credential ? { token: credential } : { registrationId: guest.id, reason }) }); setGuest(result); setCredential(null); setCheckedIn(true); setDetailsOpen(false); setResultOpen(true); }); }
  async function downloadBadge() {
    if (!guest?.admission) return;
    await run(async () => {
      const response = await fetch(base + "/badge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId: guest.id }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.errors?.[0]?.message ?? "Badge unavailable."); }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a"); link.href = url; link.download = "conference-badge.pdf"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("Badge downloaded. Print at actual size (100 × 140 mm). The system has not confirmed a physical print.");
    });
  }
  return <div className="space-y-4">
    <nav aria-label="Gate actions" className="sticky top-0 z-30 grid grid-cols-2 gap-2 rounded-xl border bg-white p-3 shadow-sm sm:grid-cols-3">
      <button className={`${action} bg-forest-900 text-white`} disabled={busy || starting} onClick={() => camera ? stopCamera() : void startCamera()}>{starting ? "Opening camera…" : camera ? "Stop camera" : "Scan QR with camera"}</button>
      <button className={action} disabled={busy || starting} onClick={() => photoInput.current?.click()}>Use QR photo</button>
      <ConferenceDrawer title="Find a guest" label="Find guest" className={action} busy={busy} open={lookupOpen} onOpenChange={value => { if (value) stopCamera(); setLookupOpen(value); }}>
        <p className="mb-4 text-sm text-gray-600">Search by name or email, then check the guest’s identity.</p>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); setCredential(null); setGuest(null); setMatches([]); void run(async () => { const rows = await request(`${base}?q=${encodeURIComponent(q.trim())}`); setMatches(rows); if (!rows.length) setMessage("No matching guests. Ask the guest to visit the registration desk."); }); }}>
          <label className="sr-only" htmlFor="gate-lookup">Guest name or email</label><input id="gate-lookup" value={q} onChange={event => setQ(event.target.value)} maxLength={100} placeholder="Guest name or email" className="min-w-0 flex-1 rounded-lg border p-3" disabled={busy} /><button className={button} disabled={busy || q.trim().length < 2}>Search</button>
        </form>
        {message && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}
        {matches.map(item => <button key={item.id} disabled={busy} className="mt-3 block w-full rounded-lg border p-4 text-left" onClick={() => { setCredential(null); setReason(""); setMessage(""); setGuest(item); setMatches([]); setLookupOpen(false); setDetailsOpen(true); }}><strong>{item.fullName}</strong><p className="text-sm">{item.category} · {item.email}</p>{item.admission && <span className="text-sm text-amber-800">Already checked in</span>}</button>)}
      </ConferenceDrawer>
      <ConferenceDrawer title="Handheld QR scanner" label="Handheld scanner" className={action} busy={busy} open={readerOpen} onOpenChange={value => { if (value) stopCamera(); setReaderOpen(value); }}>
        <p className="mb-4 text-sm text-gray-600">Click the QR box, scan the code with your handheld reader, then select Check QR.</p>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); setReaderOpen(false); void verify(token); }}><label className="block text-sm font-semibold">Scanned QR<input value={token} onChange={event => setToken(event.target.value)} autoComplete="off" spellCheck={false} maxLength={60} disabled={busy} className="mt-2 w-full rounded-lg border p-3" /></label><button className={button} disabled={busy || !token}>Check QR</button></form>
      </ConferenceDrawer>
      <ConferenceDrawer title="Guest details" label="Guest details" className={action} disabled={!guest} busy={busy} open={detailsOpen} onOpenChange={setDetailsOpen}>
        {guest && <div className="space-y-4">
          <div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-white pb-3">
            {!guest.admission && guest.eligible && <button className={`${button} bg-forest-900 text-white`} disabled={busy || (!credential && reason.trim().length < 10)} onClick={() => { setDetailsOpen(false); void confirmGuest(); }}>{busy ? "Saving entry…" : "Confirm guest entry"}</button>}
            <button className={button} disabled={busy} onClick={nextGuest}>Next guest</button>
            {guest.admission && <button className={button} disabled={busy || !!guest.blocked} onClick={() => void downloadBadge()}>Download guest tag</button>}
          </div>
          <h3 className="text-2xl font-semibold">{guest.fullName}</h3><p className="font-semibold text-forest-900">{guest.category}</p><p>{[guest.jobTitle, guest.organization].filter(Boolean).join(" · ")}</p><p className="break-words text-sm">{guest.email}</p>
          {guest.blocked ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">Entry not allowed: {guest.blocked}. Please direct the guest to the registration desk.</p> : guest.admission ? <p className="rounded-lg bg-green-50 p-4">Guest checked in. Entry recorded on {new Date(guest.admission.at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}.</p> : <p className="rounded-lg bg-green-50 p-4 text-green-800">Registered guest. Check their identity before confirming entry.</p>}
          {!guest.admission && guest.eligible && !credential && <label className="block text-sm font-semibold">How did you confirm this guest’s identity?<textarea placeholder="For example: checked the guest’s ID" className="mt-2 w-full rounded-lg border p-3" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={500} disabled={busy} /><span className="mt-1 block font-normal text-gray-600">Write at least 10 characters.</span></label>}
          {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}
        </div>}
      </ConferenceDrawer>
      <ConferenceDrawer title="Print guest tag" label="Print guest tag" className={action} disabled={!guest || !!guest.blocked} busy={busy}>
        {guest && <><p className="mb-3 text-lg font-semibold">{guest.fullName}</p><ConferenceBadgePrintTools key={guest.id} eventId={eventId} registrationId={guest.id} disabled={busy || !!guest.blocked} /></>}
      </ConferenceDrawer>
    </nav>
    <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" disabled={busy || starting} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void scanPhoto(file); }} />
    {message && !lookupOpen && !detailsOpen && <p role="status" className="rounded-lg border bg-amber-50 p-3 text-sm">{message}</p>}
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Scan the guest’s QR</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${camera ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{starting ? "Starting…" : camera ? "Camera active" : "Ready to scan"}</span></div>
      {cameras.length > 1 && <label className="mb-3 block text-sm font-semibold">Camera<select value={cameraId} disabled={busy || starting} onChange={event => { const id = event.target.value; setCameraId(id); if (camera) void startCamera(id); }} className="mt-1 w-full rounded-lg border p-2">{cameras.map((device,index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index+1}`}</option>)}</select></label>}
      <video ref={video} autoPlay muted playsInline className={camera ? "max-h-72 w-full rounded-lg bg-black" : "hidden"} aria-label="QR camera preview" />
      {!camera && <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 px-4 text-center"><p className="font-semibold text-forest-900">Ready for the next guest</p><p className="mt-2 text-sm text-gray-600">Select Scan QR with camera above, or find the guest by name.</p></div>}
      {camera && <p className="mt-2 text-center text-sm text-gray-600">Point the camera at the complete QR code.</p>}
    </section>
    {guest && <section className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current guest</p><h3 className="mt-1 text-xl font-semibold">{guest.fullName}</h3><p className="mt-1 text-sm">{guest.category} · {guest.blocked ? "Entry blocked" : guest.admission ? "Guest checked in." : "Awaiting entry confirmation"}</p></section>}
    <ConferenceGateResult open={resultOpen} guest={guest} checkedIn={checkedIn} busy={busy} message={message} onClose={() => { setResultOpen(false); setDetailsOpen(true); }} onConfirm={() => void confirmGuest()} onNext={nextGuest} />
  </div>;
}
