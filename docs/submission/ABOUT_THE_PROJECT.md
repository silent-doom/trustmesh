## Inspiration

Freelance milestones often end with the same uncomfortable question: is the work ready to be paid for? Clients want evidence that the agreed requirements are met. Developers want clear acceptance criteria instead of an open-ended approval process.

TrustMesh explores a more transparent handoff: **proof before payment**. The goal is to make the evidence visible, the review specific, and the payment decision explicit.

## What it does

TrustMesh connects a milestone's acceptance criteria to its review and payment workflow. Our first working slice focuses on a $250 HTML sign-in form with four agreed source-level requirements: labeled email and password inputs, a native submit button, and mobile layout declarations.

The demonstration shows both sides of the workflow:

1. Authorize the milestone payment.
2. Submit incomplete source code and see which requirements are missing.
3. Keep payment release locked while checks fail.
4. Submit a corrected revision and inspect the updated findings.
5. Explicitly approve the reviewed revision before capture.
6. Export the evidence and event history as a JSON receipt.

A new submission invalidates the previous review. Approval is tied to the submitted source's SHA-256 hash so that a reviewed revision is distinguishable from changed work.

**Current demo scope:** the hosted experience runs local structural checks and simulates payments in the browser. The downloadable Node.js application also implements optional Gemini and PayPal sandbox adapters. Those external integrations still require credentials and end-to-end verification; the hosted demo does not claim to make AI or PayPal calls.

## How we built it

We built the interface with HTML, CSS, and JavaScript, and the local backend with Node.js and its native HTTP, filesystem, crypto, and test modules. Avoiding a large dependency stack made the first slice straightforward to run and inspect.

The local backend stores milestone state through atomic JSON-file replacement and records events in a hash-linked audit trail. Its release policy requires passing checks, matching evidence, a valid authorization window, and explicit client confirmation. Payment amounts come from server-owned milestone state, and stable PayPal request IDs support retries.

The PayPal sandbox adapter implements OAuth, order creation with `AUTHORIZE` intent, authorization after buyer approval, capture, and void. Capture pays the configured merchant account; this version does not distribute funds to a separate contractor or offer escrow.

The Gemini adapter requests structured findings for the fixed criteria. The server validates the response and combines model findings with local structural checks. The model cannot directly approve a payment.

For the shareable demo, we built a separate browser-only version with per-tab session storage. Visitors can explore the workflow without credentials or shared payment state. This version is an interactive simulation, not a secure payment backend.

## Challenges we faced

The hardest design choice was deciding what the system should be allowed to conclude. A model's positive assessment is not proof that software is correct, and a payment authorization is not a completed payment. We kept those distinctions visible and required client approval.

We also worked through stale evidence, repeat payment requests, external-service failures, and authorization expiration. In the local implementation, a failed model request does not silently become an approved review, and a pending capture is not displayed as paid.

Deployment introduced another boundary: a single-user local server should not become a shared public financial workspace. Separating the browser demonstration from the integration backend let us share the experience without exposing credentials or one user's transaction state to another.

## Accomplishments we're proud of

We completed a runnable demonstration that shows rejection and correction, not just a successful payment animation. Five automated tests cover structural review, invalid model responses, evidence integrity, release conditions, and an HTTP journey including persistence, duplicate capture handling, cancellation, and cross-origin rejection.

We also exercised the incomplete-to-corrected-to-approved simulated payment flow in the browser and created an inspectable receipt for the reviewed revision.

## What we learned

Trustworthy automation needs boundaries that are easy to explain. Evidence should support a decision; it should not hide uncertainty behind a score. Explicit states, understandable findings, and human approval matter as much as the model integration.

We learned to distinguish source-level checks from browser-based accessibility testing, authorization from capture, and a reproducible offline demonstration from a verified external integration.

## What's next

Our immediate next step is to configure and verify Gemini review and PayPal sandbox authorization/capture, then record that complete flow. After that, we plan to add authenticated client and contractor roles, editable milestones, browser-based evidence, transactional storage, and payment reconciliation.

TrustMesh starts with a narrow promise: **make the work reviewable, and make the payment decision deliberate.**
