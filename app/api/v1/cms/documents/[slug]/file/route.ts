import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requireAuth, audit } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { documentStoragePath, documentStorageRoot } from "@/lib/document-storage";
import { revalidatePublicSite } from "@/lib/revalidate";

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Document upload requires MySQL.", 503);
    const auth = await requireAuth();
    if (!hasPermission(auth.user.role, "documents.create") && !hasPermission(auth.user.role, "documents.edit")) {
      return fail("FORBIDDEN", "Document editing is not permitted.", 403);
    }
    const gate = await rateLimit(`documents.upload:${auth.user.id}`, 20, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many document uploads. Try again shortly.", 429);
    const { slug } = await params;
    const document = await db.knowledgeDoc.findUnique({ where: { slug }, select: { id: true, slug: true, title: true, storageKey: true } });
    if (!document) return fail("NOT_FOUND", "Document not found.", 404);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size < 1) return fail("VALIDATION", "Choose a PDF file.", 422);
    if (file.size > MAX_PDF_BYTES) return fail("VALIDATION", "PDF must be 25 MB or smaller.", 422);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return fail("VALIDATION", "The uploaded file is not a valid PDF.", 422);

    const key = `${randomUUID()}.pdf`;
    const path = documentStoragePath(key)!;
    await mkdir(documentStorageRoot(), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" });
    try {
      await db.knowledgeDoc.update({
        where: { id: document.id },
        data: { storageKey: key, fileUrl: `/api/v1/documents/${encodeURIComponent(slug)}/download`, sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`, version: { increment: 1 } },
      });
    } catch (error) {
      await unlink(path).catch(() => undefined);
      throw error;
    }
    if (document.storageKey) {
      const previousPath = documentStoragePath(document.storageKey);
      if (previousPath) await unlink(previousPath).catch(() => undefined);
    }
    await audit("documents.file.upload", `document:${slug}`, {
      previousValue: document.storageKey ? "PDF replaced" : "No PDF",
      newValue: `${file.name.slice(0, 120)} (${file.size} bytes)`, ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`document file ${slug}`);
    return ok({ slug, fileUrl: `/api/v1/documents/${encodeURIComponent(slug)}/download`, sizeBytes: file.size }, { revalidated: true });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";