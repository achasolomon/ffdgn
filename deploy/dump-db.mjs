import { spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const destination = fileURLToPath(new URL('./populated-db.sql', import.meta.url));
const temporary = destination + '.tmp';
// Credentials stay inside Docker; only the selected application database is exported.
const command = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -u root --single-transaction --quick --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 --hex-blob --default-character-set=utf8mb4 --skip-add-drop-table "$MYSQL_DATABASE"';
const child = spawn('docker', ['exec', 'ffdgn-mysql', 'sh', '-c', command], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let errorText = '';
child.stderr.on('data', chunk => { errorText += chunk; });
const completed = new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve() : reject(new Error(`mysqldump failed (${code}): ${errorText}`)));
});
try {
  await Promise.all([pipeline(child.stdout, createWriteStream(temporary)), completed]);
  const sql = await fs.readFile(temporary, 'utf8');
  const tables = [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map(match => match[1]);
  const populated = [...new Set([...sql.matchAll(/^INSERT INTO `([^`]+)`/gm)].map(match => match[1]))];
  if (!tables.length || !populated.length) throw new Error('Export has no schema or populated tables.');
  if (/^CREATE DATABASE|^USE /m.test(sql)) throw new Error('Export must not select the local database name.');
  await fs.rename(temporary, destination);
  const result = { file: destination, bytes: (await fs.stat(destination)).size,
    tables: tables.length, tablesWithData: populated.length,
    includesMigrationHistory: tables.includes('_prisma_migrations') };
  await fs.writeFile(new URL('./DB_EXPORT_RESULTS.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  child.kill();
  await fs.rm(temporary, { force: true });
  throw error;
}
