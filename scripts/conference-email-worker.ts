import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { processEmailJob, smtpSettings } = await import("../lib/conference/email-worker");
  const { BADGE_LAYOUT_VERSION } = await import("../lib/conference/badge");
  console.log(`[conference-email] tag-layout=${BADGE_LAYOUT_VERSION}`);
  const settings = smtpSettings();
  console.log(`[conference-email] sender=${settings.from} relay=${settings.host}:${settings.port}. Restart this worker after changing mail settings.`);
  const { db } = await import("../lib/db");
  let stopping = false;
  process.on("SIGTERM", () => { stopping = true; }); process.on("SIGINT", () => { stopping = true; });
  const once = process.argv.includes("--once"), limit = once ? 20 : Number.POSITIVE_INFINITY;
  try {
    for (let processed = 0; !stopping && processed < limit;) {
      const result = await processEmailJob();
      if (result) { console.log(`[conference-email] job=${result.id} state=${result.state}${result.errorCode ? ` code=${result.errorCode}` : ""}`); processed++; }
      else if (once) break;
      else await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Conference email worker failed. Check SMTP, credential key, origin and database configuration; guest records remain intact."); process.exitCode = 1; });
