export const GUEST_CATEGORIES = ["VVIP", "VIP", "Speaker", "Delegate", "Sponsor", "Media", "Staff", "General"] as const;
export type GuestInput = { fullName: string; email: string; phone: string; organization: string; jobTitle: string; category: string; invitationSource: string };
export const CSV_HEADERS = ["full_name", "email", "phone", "organization", "job_title", "category", "invitation_source"] as const;
export const MAX_IMPORT_ROWS = 500;
export const MAX_CSV_BYTES = 512_000;

export function validateGuest(raw: unknown, requireEmail = true): { value?: GuestInput; errors: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { errors: ["Guest must be an object."] };
  const input = raw as Record<string, unknown>;
  const text = (key: string) => typeof input[key] === "string" ? input[key].trim() : "";
  const value: GuestInput = { fullName: text("fullName"), email: text("email").toLowerCase(), phone: text("phone"), organization: text("organization"), jobTitle: text("jobTitle"), category: text("category") || "General", invitationSource: text("invitationSource") };
  const errors: string[] = [];
  if (!value.fullName || value.fullName.length > 192) errors.push("Name is required (maximum 192 characters).");
  if ((requireEmail || value.email) && (value.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) errors.push("A valid email is required for QR delivery.");
  if (value.phone && (value.phone.length > 32 || !/^\+?[\d ()-]{5,32}$/.test(value.phone))) errors.push("Phone must contain a valid phone number.");
  if (value.organization.length > 192 || value.jobTitle.length > 192) errors.push("Organization and job title must be at most 192 characters.");
  if (!(GUEST_CATEGORIES as readonly string[]).includes(value.category)) errors.push("Choose a supported guest category.");
  if (value.invitationSource.length > 255) errors.push("Invitation source must be at most 255 characters.");
  return { value, errors };
}

// Strict RFC-style quoting: embedded commas/newlines and doubled quotes are supported.
export function parseGuestCsv(csv: string): Array<{ row: number; guest: GuestInput; errors: string[] }> {
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) throw new Error("CSV must be no larger than 512 KB.");
  const records: string[][] = [];
  let cells: string[] = [], cell = "", quoted = false, closed = false;
  const finishCell = () => { cells.push(cell); cell = ""; closed = false; };
  const finishRow = () => { finishCell(); if (cells.some(value => value.trim())) records.push(cells); cells = []; if (records.length > MAX_IMPORT_ROWS + 1) throw new Error("Import at most 500 guests per batch."); };
  const source = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\n' || char === '\r') { if (char === '\r' && source[i + 1] === '\n') i++; finishRow(); }
    else if (char === '"' && !cell && !closed) quoted = true;
    else { if (closed || char === '"') throw new Error("Malformed CSV quoting."); cell += char; }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell || closed || cells.length) finishRow();
  const headers = records.shift()?.map(value => value.trim().toLowerCase());
  if (!headers || headers.length !== CSV_HEADERS.length || !CSV_HEADERS.every((header, i) => headers[i] === header)) throw new Error(`Use the template headers: ${CSV_HEADERS.join(",")}.`);
  if (!records.length) throw new Error("CSV has no guest rows.");
  const seen = new Set<string>();
  return records.map((record, i) => {
    const checked = validateGuest({ fullName: record[0], email: record[1], phone: record[2], organization: record[3], jobTitle: record[4], category: record[5], invitationSource: record[6] });
    const guest = checked.value!;
    if (record.length !== headers.length) checked.errors.push("Column count does not match the template.");
    if (guest.email && seen.has(guest.email)) checked.errors.push("Duplicate email in this upload; review shared addresses before importing.");
    seen.add(guest.email);
    return { row: i + 2, guest, errors: checked.errors };
  });
}

export type ConferenceCapability = "view" | "guests" | "settings" | "gate";
export function conferenceAllowed(globalRole: string, assignment: string | null, capability: ConferenceCapability): boolean {
  if (["super_admin", "secretariat_admin"].includes(globalRole)) return true;
  if (assignment === "Manager") return true;
  if (assignment === "GateOfficer") return capability === "gate";
  return assignment === "RegistrationOfficer" ? capability !== "settings" : assignment === "ReportingOfficer" && capability === "view";
}

export function trustedMutationOrigin(origin: string | null, configuredOrigin: string): boolean {
  try { return !!origin && new URL(origin).origin === new URL(configuredOrigin).origin; } catch { return false; }
}
