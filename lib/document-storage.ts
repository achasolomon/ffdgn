import { join } from "node:path";
import { uploadRoot } from "./upload-dir";

const STORAGE_KEY = /^[0-9a-f-]{36}\.pdf$/i;

export function documentStorageRoot(): string {
  return join(uploadRoot(), "documents");
}

export function documentStoragePath(key: string): string | null {
  if (!STORAGE_KEY.test(key)) return null;
  return join(documentStorageRoot(), key);
}
