import { readFile } from "node:fs/promises";
import { db, dbReady, fail } from "../../../_lib";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { documentStoragePath } from "@/lib/document-storage";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await dbReady())) return fail("UNAVAILABLE", "Document storage is unavailable.", 503);
  const { slug } = await params;
  const document = await db.knowledgeDoc.findUnique({ where: { slug }, select: { id: true, title: true, status: true, visibility: true, storageKey: true } });
  if (!document?.storageKey) return fail("NOT_FOUND", "Document not found.", 404);
  const isPublic = document.status === "Published" && document.visibility === "PUBLIC";
  if (!isPublic) {
    const auth = await getAuth();
    if (!auth || !hasPermission(auth.user.role, "documents.view")) return fail("NOT_FOUND", "Document not found.", 404);
  }
  const path = documentStoragePath(document.storageKey);
  if (!path) return fail("NOT_FOUND", "Document not found.", 404);
  let bytes: Buffer;
  try { bytes = await readFile(path); }
  catch { return fail("NOT_FOUND", "Document file not found.", 404); }
  await db.knowledgeDoc.update({ where: { id: document.id }, data: { downloads: { increment: 1 } } });
  const filename = document.title.replace(/[^a-z0-9._ -]/gi, "_").trim().slice(0, 120) || "document";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"; filename*=UTF-8''${encodeURIComponent(`${filename}.pdf`)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublic ? "public, max-age=300" : "no-store, private",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";