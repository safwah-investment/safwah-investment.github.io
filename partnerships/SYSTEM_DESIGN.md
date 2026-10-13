# Safwah v3 — architecture notes

## Trust boundaries

- GitHub Pages runs a static application. All owner/partnership files remain localStorage by default, with no server-side database or shared-user store.
- The AI assistant defaults to deterministic explanations (`advisor-core.js`), not a generative model. It uses the current app snapshot from `SafwahApp.getSnapshot()` and the open partnership file from `SafwahPartnerships.getCurrent()`.
- Cloud mode is **opt-in**. `advisor-core.buildContext(..., share=true)` intentionally strips client, owner and partner names, addresses, documents, legal IDs, exact titles and freeform legal clauses.
- Supabase Edge Function `safwah-advisor` is auth-only (JWT verified by the platform and Supabase Auth), requires a verified preauthorized email, and reads the model key from server-side env. The public frontend only gets a Supabase publishable key.
- Cloud AI requests do not alter company data, contracts, votes, or ownership. Unauthorized or unconfigured cloud mode reports an error and permits fallback to local rules.

## Model boundary

- Company ownership: `state.owners`.
- Asset counterparties: `state.assetOwners`.
- Opportunity: `state.opportunities` and associated asset ownership.
- Partnership: `state.partnerships[]` with contributions, payments, status, profit, final shares, execution and three governance registers:
  - `rolesDetailed[]`: partner / timing / reward kind / amount or percentage / impact of stopping / status.
  - `rightsDetailed[]`: scope (activity, brand, branch) / right owner / ownership, profit or license / amount or percentage / status.
  - `authoritiesDetailed[]`: decision / decision owner / financial limit / quorum / signatory / reporting / status.
- Editing an advanced register resets its own status to `proposed`; it does not silently change company ownership, other agreements, or the final share decision.
- Output includes the advanced registers; no new legal rights are created by their presence.

## Test boundary

- Pure functions tested with `node --test tests/*.test.cjs`.
- Local browser functionality in `tests/browser_checks.py` and `tests/browser_v3.py`.
- AI provider correctness, actual Supabase Auth email redirects, billing, and shared synchronization require independent end-to-end production verification. No secret is placed in the website.

## Open items

1. Identity and cloud sync with per-entity permissions, secure RLS, revision-locked writes, verified signatures, and audit logs.
2. Global AI quota and spend alarms with administrator-facing controls.
3. Legal specialist verification by Saudi qualified adviser; UI links are sources, not legal opinions.
4. Independent security penetration test before storing confidential financial or real-estate documents.
