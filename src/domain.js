import { createHash, randomUUID } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
export const criteria = [
  { id: 'email', title: 'Email input', detail: 'An email input with a matching visible label.' },
  { id: 'password', title: 'Password input', detail: 'A password input with a matching visible label.' },
  { id: 'submit', title: 'Submit action', detail: 'A native submit button inside the form.' },
  { id: 'responsive', title: 'Mobile layout', detail: 'A viewport declaration and a responsive CSS media query.' },
];
export function newProject(mode = 'demo') {
  return { id: randomUUID(), title: 'An accessible sign-in experience', client: 'Northstar Studio', contractor: 'Alex Morgan', amountCents: 25000, currency: 'USD', mode,
    status: 'draft', criteria, revision: 0, evidence: '', review: null, payment: {}, events: [] };
}
export function event(project, type, detail) {
  const previous = project.events.at(-1)?.hash || '0'.repeat(64);
  const record = { index: project.events.length + 1, at: new Date().toISOString(), type, detail, previous };
  project.events.push({ ...record, hash: digest(JSON.stringify(record)) });
}
export function assert(condition, message, status = 409) { if (!condition) throw Object.assign(new Error(message), { status }); }
// This intentionally checks source structure only. It does not claim WCAG certification or execute submitted code.
export function structuralReview(source) {
  const clean = source.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const inputs = [...clean.matchAll(/<input\b[^>]*>/gi)].map(m => m[0]);
  const attr = (tag, key) => tag.match(new RegExp(`\\b${key}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
  function labeled(type) {
    const input = inputs.find(tag => attr(tag, 'type')?.toLowerCase() === type);
    const id = input && attr(input, 'id');
    const label = [...clean.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)].find(m => attr(m[1], 'for') === id && m[2].replace(/<[^>]*>/g, '').trim());
    return Boolean(id && label);
  }
  const checks = [labeled('email'), labeled('password'), /<form\b[^>]*>[\s\S]*?<button\b[^>]*type\s*=\s*["']submit["'][^>]*>[\s\S]*?<\/button>[\s\S]*?<\/form>/i.test(clean), /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(clean) && /@media\s*\([^)]*(?:max|min)-width\s*:/i.test(clean)];
  return criteria.map((c, i) => ({ id: c.id, passed: checks[i], evidence: checks[i] ? `Source structure found: ${c.detail}` : `Missing or unrecognized: ${c.detail}` }));
}
export function canRelease(p) {
  return p.status === 'ready' && p.review?.passed === true && p.review.digest === digest(p.evidence) && p.payment.authorizationId && Date.now() < Date.parse(p.payment.expiresAt);
}
export function validateAI(value) {
  assert(value && Array.isArray(value.checks) && value.checks.length === criteria.length, 'AI returned an invalid review.', 502);
  assert(criteria.every(c => value.checks.filter(x => x.id === c.id).length === 1), 'AI returned unknown or duplicate criteria.', 502);
  assert(value.checks.every(c => typeof c.passed === 'boolean' && typeof c.evidence === 'string' && c.evidence.length > 0 && c.evidence.length <= 2000), 'AI review fields are invalid.', 502);
  return value.checks;
}
