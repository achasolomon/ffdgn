import { readFile } from "node:fs/promises";
import { join } from "node:path";
export async function conferenceLogo() { return readFile(join(process.cwd(), "public/assets/brand/logo-conference.png")); }
export async function emailLogoAttachment() { return { filename: "ffdgn-logo.png", content: await conferenceLogo(), contentType: "image/png", cid: "ffdgn-logo@ffdgn" }; }
