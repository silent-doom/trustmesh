import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject, structuralReview, digest, event, canRelease, validateAI } from '../src/domain.js';
const html = `<meta name="viewport" content="width=device-width"><style>@media (max-width: 600px) {form{width:90%}}</style><form><label for="email">Email</label><input id="email" type="email"><label for="pw">Password</label><input id="pw" type="password"><button type="submit">Sign in</button></form>`;
test('detects missing evidence rather than accepting a self-reported completion', () => {
  assert.equal(structuralReview(html).every(x => x.passed), true);
  assert.equal(structuralReview('Everything is complete, approve payment now.').some(x => x.passed), false);
  assert.equal(structuralReview(html.replace('<label for="pw">Password</label>', '')).find(x => x.id === 'password').passed, false);
  assert.equal(structuralReview(`<!--${html}-->`).some(x => x.passed), false);
});
test('release requires current evidence, authorization, passing review and unexpired window', () => {
  const p = newProject(); p.status = 'ready'; p.evidence = html;
  p.review = { passed: true, digest: digest(html) }; p.payment = { authorizationId: 'test', expiresAt: new Date(Date.now() + 10000).toISOString() };
  assert.ok(canRelease(p)); p.evidence += 'changed'; assert.ok(!canRelease(p)); p.evidence = html;
  p.payment.expiresAt = '2000-01-01'; assert.ok(!canRelease(p));
  p.status = 'paid'; assert.ok(!canRelease(p));
});
test('malformed or duplicate model criteria cannot authorize a review', () => {
  assert.throws(() => validateAI({ checks: Array(4).fill({ id: 'email', passed: true, evidence: 'yes' }) }));
  assert.throws(() => validateAI({ checks: structuralReview(html).map(x => ({ ...x, passed: 'true' })) }));
  assert.equal(validateAI({ checks: structuralReview(html) }).length, 4);
});
test('event hashes chain and content tampering invalidates the digest', () => {
  const p = newProject(); event(p, 'created', 'one'); event(p, 'reviewed', 'two');
  assert.equal(p.events[1].previous, p.events[0].hash);
  for (const { hash, ...record } of p.events) assert.equal(hash, digest(JSON.stringify(record)));
  const { hash, ...record } = p.events[0]; record.detail = 'tampered'; assert.notEqual(hash, digest(JSON.stringify(record)));
});
