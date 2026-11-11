# Artifact review and build decision

Reviewed November 11, 2026. Decision: build **TrustMesh — Proof before payment**, a constrained milestone acceptance and client-approved payment workflow.

## Review of every input

| Artifact | Assessment |
|---|---|
| HACKATHON_EXTRACTION_SYSTEM_PROMPT.md | A reusable research procedure, not competition evidence. Its emphasis on primary sources and exact deliverables is useful; it does not establish any rules itself. |
| HACKATHON_WINNING_PLAN.md | Useful inventory and demo structure. Contains unsupported market statistics, unverified prize claims, and inaccurate hard requirements. Do not treat it as authoritative. |
| PROJECT_IDEAS_PART_1.md | Five relevant problems, but optimistic numerical scores conceal major dependencies. TrustMesh has the strongest narrow before/after demonstration. |
| PROJECT_IDEAS_PART_2.md | Six ideas with interesting narratives; most require unavailable third-party data, financial permissions, physical operations, or reliable realtime inference. |
| TOP_PICKS_AND_MVP_EXECUTION_ROADMAP.md | Useful sprint outline. Its own ranking and recommended first pick differ; scores are subjective, not probabilities. Escrow, guaranteed payout, and zero-dispute claims need removal. |

## Comparison of all eleven ideas

These are engineering judgments for the remaining submission window, not judge scores or win probabilities.

| Concept | What works | Main delivery risk | Decision |
|---|---|---|---|
| PayAgent | Clear procurement workflow and measurable budget guardrails | Supplier access, negotiation, and multi-vendor transactions would mostly be simulations | Runner-up if narrowed to a fixed catalog |
| PayMediate | Concrete merchant pain and evidence assembly | Dispute lifecycle access, real case data, and unsupported win estimates | Defer |
| TrustMesh | Immediate failed-work → corrected-work → payment narrative | Authorization is not escrow; subjective review is unreliable | **Build with fixed criteria and client approval** |
| InvoiceIQ | Practical, reproducible, relatively small API surface | Differentiation is weaker; predictive collection claims lack training data | Best fallback |
| VoicePay Assist | Compelling accessibility interaction | Realtime voice, browser permissions, vault eligibility, and voice identity claims | Defer until payment flow is proven |
| SubSentry | Relatable consumer value | Merchant subscription APIs do not imply universal access to consumer subscriptions | Do not build the broad version |
| BorderLess AI | Clear international-commerce problem | Reliable tariffs, classification, and guaranteed FX require verified data/services | Defer |
| InferencePay | Interesting agent-commerce infrastructure | Billing aggregation, vault eligibility, provider settlement, and reconciliation scope | Too broad for this sprint |
| MediAudit Pay | Strong human story | Reliable billing evidence, settlement acceptance, and sensitive data handling | Defer |
| StreamSplit AI | Visually compelling live demonstration | Diarization and revenue attribution do not establish fair payment allocation | Defer |
| EcoReturn | Tangible trade-in journey | Appraisal uncertainty, physical verification, logistics, and payout access | Defer |

## Why the adjusted TrustMesh

The key demonstration is not that AI can move money. It is that a payment workflow can expose specific evidence, refuse incomplete work, invalidate stale approval, and let the client approve a reviewed revision. The bad submission is as important as the successful one.

Scope: one $250 HTML sign-in milestone, four agreed criteria, direct merchant authorization/capture, optional Gemini evidence analysis, local audit trail. Capture goes to the configured PayPal merchant. This does not disburse funds to a separate freelancer account and is not a marketplace or escrow service.

## Corrections to the original research

Primary sources checked on November 11, 2026:

- [Official competition rules](https://paypalaihackathon.devpost.com/rules): deadline November 12, noon Pacific, which is **November 13, 1:30 AM IST**. A functional local build with complete instructions can satisfy access; hosting is optional. Public open-source code is required. The video should be under three minutes and publicly visible on YouTube. Treat the rules as authoritative over the old checklist.
- [PayPal authorization/capture documentation](https://developer.paypal.com/checkout/delay-capture/): authorization and capture are distinct. Capture is strongest within the three-day honor period, with an overall authorization window up to 29 days. Authorization is not proof of capture or contractor payout. The MVP conservatively stops capture after three days and does not implement reauthorization.
- [PayPal Payments API](https://developer.paypal.com/api/payments/v2): authorization capture and void are separate operations. Adding Payouts would introduce a separate flow rather than completing the original authorization.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output): structured responses help parsing; they do not establish that a model's findings are correct. The server validates criterion IDs/types and combines model findings with structural checks.

Never commit API secrets. Give judges documented setup or appropriately scoped test access through an agreed channel. Do not use private credentials as repository examples. Unverified medical error rates, loss percentages, ROI claims, and prize values from the source documents are deliberately excluded from the product and pitch.

The official rules specify **five equally weighted criteria**: implementation, design, potential impact, innovation, and presentation. They also confirm the listed grand and honorable-mention amounts, but permit only one grand prize OR one honorable mention, plus at most one sponsor prize. The original plan should not imply that multiple honorable mentions can be stacked.

## Competitive execution priorities

1. Make the failed-review and corrected-review sequence reliable (implemented and tested).
2. Connect Gemini and PayPal sandbox with the user's development credentials; record actual provider IDs and findings (adapters implemented; external verification outstanding).
3. Add browser-based accessibility evidence, broader contract editing, signed approval identities, database transactions, and verified payment reconciliation only after the narrow integration succeeds.
4. Publish a public licensed repository and record an honest sub-three-minute working demo. No result, prize, or win probability is guaranteed.
