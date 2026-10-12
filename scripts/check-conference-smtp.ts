import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd(), !process.argv.includes("--production"));
  const { smtpSettings, transport } = await import("../lib/conference/email-worker");
  const settings = smtpSettings();
  console.log(`SMTP configuration ready: ${settings.host}:${settings.port}; ${settings.port === 465 ? "implicit TLS" : "required STARTTLS"}; sender/login/key present.`);
  if (!process.argv.includes("--verify")) return;
  const { smtp } = transport();
  try { await smtp.verify(); console.log("SMTP connection, TLS and authentication verified. No email sent."); }
  finally { smtp.close(); }
}
main().catch(error => { const detail = error as { code?: string; responseCode?: number }; const code = typeof detail.code === "string" && /^[A-Z0-9_]+$/.test(detail.code) ? detail.code : "SMTP_CONFIGURATION_OR_CONNECTION"; console.error(`SMTP check failed: ${code}${detail.responseCode ? ` (${detail.responseCode})` : ""}. Credentials and server responses are omitted.`); process.exitCode = 1; });
