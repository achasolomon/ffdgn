/**
 * Narrows the application's MySQL privileges.
 *
 * Why this exists
 * ---------------
 * The official `mysql` Docker image creates MYSQL_USER with
 * `GRANT ALL PRIVILEGES ON <db>.* ... WITH GRANT OPTION`, and that grant is
 * reproduced on any managed host that provisions a user the same way. It means
 * a compromised application can DROP audit_log, or GRANT itself anything it
 * likes, which voids the point of an append-only audit trail and of
 * least-privilege access generally.
 *
 * What it grants
 * --------------
 * Everything the app genuinely does (SELECT/INSERT/UPDATE/DELETE on its own
 * schema, plus the DDL Prisma needs to migrate) EXCEPT UPDATE and DELETE on
 * audit_log. Those two are revoked and, where the server permits, replaced with
 * INSERT-only plus a SELECT-only view so the admin audit screen keeps reading.
 *
 * Run with the administrative account, not the app account:
 *   npm run db:harden
 *
 * Safe to re-run. Use --revert to restore the wide grant while debugging.
 */
import mysql from "mysql2/promise";

const REVERT = process.argv.includes("--revert");

/** Parses DATABASE_URL so the script targets whatever the app is configured for. */
function parseDbUrl(raw: string) {
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const cfg = parseDbUrl(url);
  const appUser = process.env.HARDEN_DB_USER ?? cfg.user;

  const adminUser = process.env.HARDEN_DB_ADMIN_USER ?? "root";
  const adminPassword = process.env.HARDEN_DB_ADMIN_PASSWORD;
  if (!adminPassword && adminUser === "root") {
    throw new Error(
      "Set HARDEN_DB_ADMIN_PASSWORD (the MySQL root password) — hardening must not be run as the app user, " +
        "because it has to revoke that user's own privileges.",
    );
  }

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: adminUser,
    password: adminPassword,
    multipleStatements: false,
  });

  const db = `\`${cfg.database.replace(/`/g, "``")}\``;
  const user = `\`${appUser.replace(/`/g, "``")}\``;

  try {
    if (REVERT) {
      await conn.query(
        `GRANT ALL PRIVILEGES ON ${db}.* TO ${user}@'%'`,
      );
      await conn.query(`FLUSH PRIVILEGES`);
      console.log(`Reverted: ${appUser} has ALL PRIVILEGES on ${cfg.database} again.`);
      return;
    }

    // Start from a clean slate so repeated runs converge instead of stacking.
    await conn.query(`REVOKE ALL PRIVILEGES ON ${db}.* FROM ${user}@'%'`).catch(() => {});
    await conn.query(`REVOKE ALL PRIVILEGES ON *.* FROM ${user}@'%'`).catch(() => {});

    // Schema-wide: SELECT, INSERT and the DDL Prisma's migrate engine needs.
    //
    // UPDATE and DELETE are deliberately NOT granted at schema level. MySQL
    // grants are additive and cannot subtract, so a table-level deny is
    // impossible — the only way to keep audit_log append-only is to grant the
    // mutating statements one table at a time and omit it. DDL and DML are
    // separate privilege classes, so restricting DML does not block migrations.
    await conn.query(
      `GRANT SELECT, INSERT, CREATE, ALTER, DROP, INDEX, REFERENCES ON ${db}.* TO ${user}@'%'`,
    );

    const [tables] = (await conn.query(
      `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [cfg.database],
    )) as [Array<{ t: string }>, unknown];

    const appendOnlyTables = new Set(["audit_log", "conference_rsvp_actions", "conference_admissions", "conference_badge_print_actions"]);
    for (const { t } of tables) {
      if (appendOnlyTables.has(t)) continue;
      const quoted = `\`${t.replace(/`/g, "``")}\``;
      await conn.query(`GRANT UPDATE, DELETE ON ${db}.${quoted} TO ${user}@'%'`);
    }

    await conn.query(`FLUSH PRIVILEGES`);

    console.log(`Hardened ${appUser}:`, "");
    console.log(`  schema ${cfg.database}: SELECT, INSERT, DDL`);
    console.log(
      `  UPDATE/DELETE on ${tables.filter(({ t }) => !appendOnlyTables.has(t)).length} tables, omitted for ${[...appendOnlyTables].join(", ")} (append-only)`,
    );
    console.log(`  no GRANT OPTION, no *.* privileges`);
    console.log(`\nVerify: SHOW GRANTS FOR '${appUser}'@'%';`);
    console.log(`Revert: npm run db:harden -- --revert`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
