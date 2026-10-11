import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import { cmsStatus } from "../lib/cms-status";
import { db } from "../lib/db";
loadEnvConfig(process.cwd());
async function main() {
  const status = await cmsStatus();
  if (!status) throw new Error("Database unavailable: cannot report content completeness.");
  const report = { checkedAt: new Date().toISOString(), ...status };
  await writeFile("deploy/CMS_CONTENT_STATUS.json", JSON.stringify(report, null, 2) + "\n");
  console.log(`${status.populatedDesigns}/${status.designs} current designs populated; ${status.fields} editable fields; ${status.assets} public assets.`);
  for (const issue of status.issues) console.log(`${issue.label}: ${issue.items.length}`);
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error instanceof Error ? error.message : "Report failed"); process.exitCode = 1; });
