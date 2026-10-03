import { resolve } from "node:path";

/** Persistent storage shared by media and private documents. */
export function uploadRoot(): string {
  return resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || "/home/ffdgnorg/uploads");
}
