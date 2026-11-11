import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { newProject, event, assert, digest, canRelease } from './domain.js';
import { reviewEvidence, paypal } from './providers.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 3000);
const mode = process.env.PAYMENT_MODE || 'demo';
const aiMode = process.env.AI_MODE || 'demo';
assert(['demo', 'sandbox'].includes(mode), 'PAYMENT_MODE must be demo or sandbox.');
assert(['demo', 'gemini'].includes(aiMode), 'AI_MODE must be demo or gemini.');
const appURL = process.env.APP_URL || `http://localhost:${port}`;
const dataDir = process.env.DATA_DIR || `${root}.data`;
await mkdir(dataDir, { recursive: true });
let project;
try { project = JSON.parse(await readFile(`${dataDir}/${mode}.json`, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; project = newProject(mode); event(project, 'created', 'Milestone created with four fixed acceptance criteria.'); }
async function save() { await writeFile(`${dataDir}/${mode}.tmp`, JSON.stringify(project, null, 2), { mode: 0o600 }); await rename(`${dataDir}/${mode}.tmp`, `${dataDir}/${mode}.json`); }
await save();
let locked = false;
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); }
async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; assert(Buffer.byteLength(text) <= 100000, 'Request is too large.', 413); }
  try { return JSON.parse(text || '{}'); } catch { assert(false, 'Invalid JSON.', 400); }
}
async function action(path, input) {
  if (path === '/api/reset') {
    assert(mode === 'demo', 'Reset is only available in offline demo mode.');
    project = newProject(mode); event(project, 'created', 'Fresh demo milestone.');
  } else if (path === '/api/order') {
    assert(project.status === 'draft' || project.status === 'awaiting_approval', 'This milestone already has a payment authorization.');
    if (mode === 'demo') {
      project.payment = { orderId: `DEMO-${randomUUID()}`, authorizationId: `DEMO-AUTH-${randomUUID()}`, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString() };
      project.status = 'authorized'; event(project, 'authorized', 'Simulated $250 authorization. No funds moved.');
    } else if (!project.payment.orderId) {
      const result = await paypal('/v2/checkout/orders', { intent: 'AUTHORIZE', purchase_units: [{ reference_id: project.id, description: project.title, amount: { currency_code: project.currency, value: (project.amountCents / 100).toFixed(2) } }], payment_source: { paypal: { experience_context: { return_url: `${appURL}/?approved=1`, cancel_url: `${appURL}/?cancelled=1`, user_action: 'CONTINUE', shipping_preference: 'NO_SHIPPING' } } } }, `${project.id}-order`);
      const approvalURL = result.links?.find(l => ['payer-action', 'approve'].includes(l.rel))?.href;
      assert(result.id && approvalURL && new URL(approvalURL).hostname.endsWith('.paypal.com'), 'PayPal did not return an approval link.', 502);
      project.payment = { orderId: result.id, approvalURL }; project.status = 'awaiting_approval'; event(project, 'order_created', 'PayPal sandbox order created. Buyer approval is required.');
    }
  } else if (path === '/api/authorize') {
    assert(mode === 'sandbox', 'Use the demo authorization button in demo mode.');
    if (project.payment.authorizationId) return;
    assert(project.status === 'awaiting_approval', 'Create an order and approve it with PayPal first.');
    const result = await paypal(`/v2/checkout/orders/${encodeURIComponent(project.payment.orderId)}/authorize`, {}, `${project.id}-authorize`);
    const auth = result.purchase_units?.[0]?.payments?.authorizations?.[0];
    assert(auth?.id && auth.status === 'CREATED', 'PayPal has not confirmed authorization.', 502);
    project.payment.authorizationId = auth.id;
    // Conservative three-day capture limit. Reauthorization is outside this MVP.
    project.payment.expiresAt = new Date(Math.min(Date.parse(auth.expiration_time) || Infinity, Date.now() + 3 * 86400000)).toISOString();
    project.status = 'authorized'; event(project, 'authorized', `Sandbox authorization ${auth.id} confirmed.`);
  } else if (path === '/api/review') {
    assert(['authorized', 'changes_requested', 'ready'].includes(project.status), 'Authorize the milestone before reviewing evidence.');
    assert(typeof input.evidence === 'string' && input.evidence.length >= 20 && input.evidence.length <= 50000, 'Submit 20–50,000 characters of HTML source.', 400);
    project.evidence = input.evidence; project.revision++; project.review = null; project.status = 'authorized';
    event(project, 'evidence_submitted', `Revision ${project.revision}; SHA-256 ${digest(project.evidence)}.`);
    await save(); // Invalidate any old approval even if model evaluation fails.
    const review = await reviewEvidence(project.evidence, aiMode);
    project.review = { ...review, digest: digest(project.evidence), passed: review.checks.every(c => c.passed), at: new Date().toISOString() };
    project.status = project.review.passed ? 'ready' : 'changes_requested';
    event(project, 'review_completed', `${review.checks.filter(c => c.passed).length}/4 checks passed using ${review.provider}.`);
  } else if (path === '/api/release') {
    if (project.status === 'paid') return;
    assert(input.confirm === true, 'Explicit client confirmation is required.', 400);
    assert(canRelease(project), 'Release blocked: require passing current evidence and a valid authorization.');
    assert(input.digest === project.review.digest, 'Evidence changed. Review the latest revision before releasing payment.');
    if (mode === 'demo') {
      project.payment.captureId = `DEMO-CAP-${randomUUID()}`; project.status = 'paid';
      event(project, 'captured', 'Simulated $250 capture after client approval. No funds moved.');
    } else {
      const result = await paypal(`/v2/payments/authorizations/${encodeURIComponent(project.payment.authorizationId)}/capture`, { amount: { currency_code: project.currency, value: (project.amountCents / 100).toFixed(2) }, final_capture: true }, `${project.id}-capture`);
      assert(result.id, 'PayPal did not return a capture ID.', 502);
      project.payment.captureId = result.id; project.payment.captureStatus = result.status;
      project.status = result.status === 'COMPLETED' ? 'paid' : 'capture_pending';
      event(project, 'capture_response', `PayPal capture ${result.id}: ${result.status}.`);
    }
  } else if (path === '/api/void') {
    assert(['authorized', 'changes_requested', 'ready'].includes(project.status), 'Only an uncaptured authorization can be voided.');
    if (mode === 'sandbox') await paypal(`/v2/payments/authorizations/${encodeURIComponent(project.payment.authorizationId)}/void`, {}, `${project.id}-void`);
    project.status = 'voided'; event(project, 'voided', mode === 'demo' ? 'Simulated authorization cancelled.' : 'PayPal sandbox authorization voided.');
  } else assert(false, 'Endpoint not found.', 404);
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, appURL);
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, { project, config: { mode, aiMode, aiConfigured: Boolean(process.env.GEMINI_API_KEY), paypalConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) } });
    if (req.method === 'GET' && url.pathname === '/api/receipt') return json(res, 200, { ...project, exportedAt: new Date().toISOString(), notice: 'Evidence and event chain are local audit records, not independent attestation. Capture pays the configured merchant; no contractor payout is implemented.' });
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      assert(req.headers['content-type']?.startsWith('application/json'), 'JSON content type required.', 415);
      assert(!req.headers.origin || req.headers.origin === new URL(appURL).origin, 'Cross-origin request rejected.', 403);
      assert(!locked, 'Another action is in progress. Please retry.', 409);
      locked = true;
      try { const input = await body(req); await action(url.pathname, input); await save(); return json(res, 200, { project }); } finally { locked = false; }
    }
    const file = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' }[url.pathname];
    assert(req.method === 'GET' && file, 'Not found.', 404);
    res.writeHead(200, { 'Content-Type': file.endsWith('html') ? 'text/html; charset=utf-8' : file.endsWith('css') ? 'text/css' : 'text/javascript', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    res.end(await readFile(`${root}public/${file}`));
  } catch (error) { json(res, error.status || 500, { error: error.status ? error.message : 'Operation failed. Check server configuration and retry.' }); }
});
server.listen(port, '127.0.0.1', () => console.log(`TrustMesh running at http://localhost:${port} · payments: ${mode} · review: ${aiMode}`));
