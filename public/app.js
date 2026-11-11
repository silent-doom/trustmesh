const $ = id => document.getElementById(id);
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let project, config, busy = false;
const names = { draft: 'Draft', awaiting_approval: 'Awaiting PayPal', authorized: 'Awaiting evidence', changes_requested: 'Changes requested', ready: 'Ready for approval', paid: 'Payment captured', capture_pending: 'Capture pending', voided: 'Authorization cancelled' };
const complete = `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in · Northstar</title>
  <style>
    form { width: min(90%, 420px); margin: 4rem auto; }
    label, input, button { display: block; margin: 12px 0; }
    @media (max-width: 600px) { form { width: 90%; margin: 2rem auto; } }
  </style>
</head>
<body>
  <form>
    <h1>Welcome back</h1>
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" autocomplete="email" required>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`;
const incomplete = `<html lang="en">
<head><title>Sign in · Northstar</title></head>
<body>
  <form>
    <h1>Welcome back</h1>
    <label for="email">Email address</label>
    <input id="email" type="email">
    <input type="password" placeholder="Password">
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`;
function message(text, error = false) { $('message').className = error ? 'error' : 'success'; $('message').textContent = text; }
async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Request failed.'); return result;
}
async function refresh() { const state = await api('/api/state'); project = state.project; config = state.config; render(); }
function render() {
  const p = project, passed = p.review?.checks.filter(c => c.passed).length || 0;
  $('mode').textContent = config.mode === 'demo' ? '● Offline demo' : '● PayPal sandbox';
  $('notice').textContent = `${config.mode === 'demo' ? 'Simulated payments · No funds move' : 'PayPal sandbox · Test funds only'}  /  ${config.aiMode === 'demo' ? 'Local structural checks · No AI model connected' : 'Gemini review + local structural checks'}`;
  $('status').textContent = names[p.status]; $('status').className = `badge ${p.status}`;
  $('payment-status').textContent = ({ draft: 'Not authorized', awaiting_approval: 'Approval pending', paid: 'Captured', voided: 'Cancelled', capture_pending: 'Capture pending' })[p.status] || 'Authorized';
  $('payment-hint').textContent = p.status === 'paid' ? (config.mode === 'demo' ? 'Simulated receipt available' : 'PayPal sandbox capture confirmed') : p.payment.expiresAt ? `Capture window ends ${new Date(p.payment.expiresAt).toLocaleDateString()}` : 'Client approval required';
  $('check-count').innerHTML = `${passed} <span>/ 4</span>`;
  $('check-hint').textContent = p.review ? `Revision ${p.revision} · ${p.review.passed ? 'all source checks passed' : 'corrections needed'}` : 'Awaiting a submission';
  $('criteria').innerHTML = p.criteria.map(c => { const result = p.review?.checks.find(r => r.id === c.id); return `<div class="criterion ${result ? result.passed ? 'pass' : 'fail' : ''}"><span class="check-icon">${result ? result.passed ? '✓' : '!' : '·'}</span><div><strong>${escape(c.title)}</strong><small>${escape(c.detail)}</small></div></div>`; }).join('');
  [1,2,3].forEach((n,i) => $(`step-${n}`).className = [Boolean(p.payment.authorizationId), Boolean(p.review?.passed), p.status === 'paid'][i] ? 'done' : '');
  const ready = p.status === 'ready' && p.evidence === $('source').value && Date.now() < Date.parse(p.payment.expiresAt);
  $('guard-title').textContent = p.status === 'paid' ? 'Payment captured' : ready ? 'Ready for your approval' : 'Release is locked';
  $('guard-detail').textContent = p.status === 'paid' ? 'The receipt is in your audit trail.' : ready ? 'All four checks passed on this revision.' : 'Valid authorization and current passing evidence required.';
  $('guard-icon').textContent = ready || p.status === 'paid' ? '✓' : '◇';
  $('release-copy').textContent = p.status === 'paid' ? 'The reviewed revision was approved and its capture is recorded below.' : p.status === 'capture_pending' ? 'PayPal returned a pending capture. Verify its status with PayPal before treating it as paid.' : 'Authorize the milestone, then review the deliverable against the agreed criteria.';
  $('authorize').hidden = !['draft', 'awaiting_approval'].includes(p.status);
  $('authorize').textContent = config.mode === 'demo' ? 'Authorize demo payment →' : p.payment.approvalURL ? 'Continue to PayPal →' : 'Authorize with PayPal →';
  $('confirm-authorization').hidden = p.status !== 'awaiting_approval';
  $('authorize').disabled = busy; $('confirm-authorization').disabled = busy;
  $('review').disabled = busy || !['authorized','changes_requested','ready'].includes(p.status) || $('source').value.length < 20;
  $('review').textContent = busy ? 'Working…' : 'Review evidence ↗';
  $('release').disabled = busy || !ready || !$('consent').checked;
  $('release').textContent = p.status === 'paid' ? (config.mode === 'demo' ? 'Demo capture complete ✓' : 'Sandbox capture complete ✓') : config.mode === 'demo' ? 'Simulate release ↗' : 'Capture $250.00 ↗';
  $('consent').disabled = busy || !ready;
  $('void').hidden = !['authorized','changes_requested','ready'].includes(p.status); $('void').disabled = busy;
  $('reset').hidden = config.mode !== 'demo'; $('reset').disabled = busy;
  $('source').disabled = busy || ['paid','capture_pending','voided'].includes(p.status);
  ['sample-complete','sample-incomplete','upload'].forEach(id => $(id).disabled = $('source').disabled);
  $('provider-label').textContent = p.review?.provider || (config.aiMode === 'gemini' ? 'Gemini review configured' : 'Local structural review');
  $('events').innerHTML = [...p.events].reverse().slice(0,6).map(e => `<div class="event"><strong>${escape(e.type.replaceAll('_',' '))}</strong><p>${escape(e.detail)}</p><small>${new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Event ${e.index}</small></div>`).join('');
  $('review-results').innerHTML = p.review ? `<div class="result-summary ${p.review.passed ? '' : 'failed'}">${p.review.passed ? '✓ All source checks passed. Client review is still required.' : '! Payment blocked. Correct the findings and submit again.'}</div>${p.review.checks.map(c => `<div class="finding"><strong>${c.passed ? '✓' : '!'} ${escape(p.criteria.find(x => x.id === c.id).title)}</strong><p>${escape(c.evidence)}</p>${c.modelEvidence ? `<p>Model finding: ${escape(c.modelEvidence)}</p>` : ''}</div>`).join('')}<div class="hash">Revision ${p.revision} · SHA-256 ${escape(p.review.digest)}</div>` : '';
}
async function run(path, data, success) {
  if (busy) return; busy = true; render();
  try { const result = await api(path, data); project = result.project; $('consent').checked = false; if (success) message(success); return result; }
  catch (e) { message(e.message, true); await refresh().catch(() => {}); }
  finally { busy = false; render(); }
}
$('sample-incomplete').onclick = () => { $('source').value = incomplete; $('consent').checked = false; render(); };
$('sample-complete').onclick = () => { $('source').value = complete; $('consent').checked = false; render(); };
$('source').oninput = () => { $('consent').checked = false; $('source-meta').textContent = `${$('source').value.length.toLocaleString()} characters · Source is never executed`; render(); };
$('consent').onchange = render;
$('upload').onchange = async e => { const file = e.target.files[0]; if (!file) return; if (file.size > 50000) return message('Upload a file smaller than 50 KB.', true); $('source').value = await file.text(); $('source').oninput(); };
$('review').onclick = () => run('/api/review', { evidence: $('source').value }, 'Review complete. Inspect the findings below.');
$('authorize').onclick = async () => { const result = await run('/api/order', {}, config.mode === 'demo' ? 'Demo authorization created. Load the incomplete sample to test the payment gate.' : 'Order created. Approve in PayPal, then confirm authorization here.'); if (result?.project.payment.approvalURL) location.href = result.project.payment.approvalURL; };
$('confirm-authorization').onclick = () => run('/api/authorize', {}, 'PayPal sandbox authorization confirmed.');
$('release').onclick = () => run('/api/release', { confirm: $('consent').checked, digest: project.review?.digest }, 'Capture response recorded. See payment status and export the audit receipt.');
$('void').onclick = () => { if (confirm('Cancel this uncaptured authorization?')) run('/api/void', {}, 'Authorization cancelled.'); };
$('reset').onclick = async () => { if (confirm('Reset this offline demo and clear its local audit trail?')) { await run('/api/reset', {}, 'Fresh demo ready.'); $('source').value = ''; render(); } };
refresh().then(() => { $('source').value = project.evidence || incomplete; render(); if (new URLSearchParams(location.search).has('approved')) message('Returned from PayPal. Click “Confirm PayPal approval” to verify and authorize server-side.'); if (new URLSearchParams(location.search).has('cancelled')) message('PayPal approval was cancelled. No authorization has been confirmed.'); }).catch(e => message(`Could not load workspace: ${e.message}`, true));
