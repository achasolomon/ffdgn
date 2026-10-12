import { build } from "esbuild";
import { existsSync } from "node:fs";
if (!existsSync(".next/standalone/server.js")) throw new Error("Run the Next.js production build before packaging the worker.");
await build({ entryPoints: ["scripts/conference-email-worker.ts"], outfile: ".next/standalone/conference-email-worker.cjs", bundle: true, platform: "node", target: "node22", format: "cjs", external: ["@prisma/client", "canvas"], legalComments: "linked", logLevel: "warning" });
console.log("Packaged conference-email-worker.cjs for Node 22 beside standalone server.js.");
