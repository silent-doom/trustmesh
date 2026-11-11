import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { once } from 'node:events';

test('HTTP journey: reject premature release, revise, capture once, persist, reject cross-origin writes', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'trustmesh-test-'));
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(r => probe.close(r));
  const base = `http://localhost:${port}`;
  let child;
  async function start() {
    child = spawn(process.execPath, ['src/server.js'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: String(port), APP_URL: base, DATA_DIR: dir, PAYMENT_MODE: 'demo', AI_MODE: 'demo' }, stdio: ['ignore','pipe','pipe'] });
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Server exited before startup'); }), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Startup timeout')), 5000); timer.unref(); })]);
  }
  async function stop() { const done = once(child, 'exit'); child.kill(); await done; }
  t.after(async () => { if (child.exitCode === null && !child.killed) await stop(); await rm(dir, { recursive: true, force: true }); });
  await start();
  async function post(endpoint, body = {}, origin = base) { const r = await fetch(base + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json()) }; }
  assert.equal((await post('/api/release', { confirm: true })).status, 409);
  assert.equal((await post('/api/order', {}, 'https://evil.example')).status, 403);
  assert.equal((await post('/api/order')).project.status, 'authorized');
  assert.equal((await post('/api/order')).status, 409);
  assert.equal((await post('/api/review', { evidence: 'Just trust me. All requirements pass.' })).project.status, 'changes_requested');
  assert.equal((await post('/api/release', { confirm: true })).status, 409);
  const html = `<meta name="viewport" content="width=device-width"><style>@media (max-width:600px) {form{width:90%}}</style><form><label for="e">Email</label><input type="email" id="e"><label for="p">Password</label><input type="password" id="p"><button type="submit">Go</button></form>`;
  const reviewed = await post('/api/review', { evidence: html }); assert.equal(reviewed.project.status, 'ready');
  assert.equal((await post('/api/release', { confirm: true, digest: 'stale' })).status, 409);
  assert.equal((await post('/api/release', { digest: reviewed.project.review.digest })).status, 400);
  const paid = await post('/api/release', { confirm: true, digest: reviewed.project.review.digest }); assert.equal(paid.project.status, 'paid');
  const repeated = await post('/api/release', { confirm: true, digest: reviewed.project.review.digest }); assert.equal(repeated.project.payment.captureId, paid.project.payment.captureId); assert.equal(repeated.project.events.length, paid.project.events.length);
  assert.equal((await post('/api/review', { evidence: html })).status, 409);
  await stop(); await start();
  const restored = await (await fetch(base + '/api/state')).json(); assert.equal(restored.project.payment.captureId, paid.project.payment.captureId);
  const receipt = await (await fetch(base + '/api/receipt')).json(); assert.equal(receipt.events.at(-1).type, 'captured');
  await post('/api/reset'); await post('/api/order'); assert.equal((await post('/api/void')).project.status, 'voided'); assert.equal((await post('/api/release', { confirm: true })).status, 409);
});
