import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const root = path.resolve(__dirname, '..');
  const port = process.env.SMOKE_PORT || '3100';
  const uploadDir = path.join(__dirname, 'tools', 'smoke-uploads');
  const fixture = '2026/10/00000000-0000-4000-8000-000000000000.jpg';
  fs.mkdirSync(path.dirname(path.join(uploadDir, fixture)), { recursive: true });
  fs.copyFileSync(path.join(root, 'public/assets/brand/logo-whitebg.jpg'), path.join(uploadDir, fixture));
  const env = { ...process.env, NODE_ENV: 'production', PORT: port, HOSTNAME: '127.0.0.1',
    UPLOAD_DIR: uploadDir, NEXTAUTH_URL: `http://127.0.0.1:${port}`, NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
    NEXT_TELEMETRY_DISABLED: '1' };
  delete env.DATABASE_URL;
  delete env.REDIS_URL;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(root, '.next/standalone'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  let launchError;
  let closed = false;
  server.on('close', () => { closed = true; });
  server.on('error', error => { launchError = error; });
  const base = `http://127.0.0.1:${port}`;
  async function check(url, expected, options) {
    const response = await fetch(base + url, { ...options, signal: AbortSignal.timeout(30000) });
    await response.arrayBuffer();
    if (response.status !== expected) throw new Error(`${url}: expected ${expected}, got ${response.status}`);
    return { path: url, status: response.status };
  }
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (launchError) throw launchError;
      if (server.exitCode !== null) throw new Error(`Server exited at startup: ${server.exitCode}`);
      try {
        if (!output.includes('Ready in')) throw new Error('Waiting for this server to start');
        await fetch(base + '/api/healthz', { signal: AbortSignal.timeout(500) }); ready = true; break;
      }
      catch { await new Promise(resolve => setTimeout(resolve, 300)); }
    }
    if (!ready) throw new Error('Server did not start within 30 seconds');
    const checks = [];
    checks.push(await check('/', 200));
    checks.push(await check('/api/healthz', 503));
    checks.push(await check('/api/auth/providers', 200));
    checks.push(await check('/uploads/' + fixture, 200));
    checks.push(await check('/uploads/' + fixture, 206, { headers: { Range: 'bytes=0-9' } }));
    checks.push(await check('/uploads/' + fixture, 416, { headers: { Range: 'bytes=999999999-' } }));
    checks.push(await check('/uploads/documents/private.pdf', 404));
    checks.push(await check('/_next/image?url=%2Fassets%2Fbrand%2Flogo-whitebg.jpg&w=256&q=75', 200));
    const result = { node: process.version, port: Number(port), checks, database: 'deliberately unavailable', redis: 'deliberately unavailable' };
    fs.writeFileSync(path.join(__dirname, 'SMOKE_RESULTS.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (!closed) {
      const stopped = new Promise(resolve => server.once('close', resolve));
      server.kill();
      await stopped;
    }
    fs.writeFileSync(path.join(__dirname, 'tools', 'smoke-server.log'), output);
    console.log('Standalone server stopped.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
