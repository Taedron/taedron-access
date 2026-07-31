---
name: finish-task
description: The Definition of Done for @taedron/access. Run this checklist at the end of EVERY task before reporting it complete — typecheck, tests, gate reasoning, docs, merge. Releasing is a SEPARATE skill and needs owner approval.
---

# Finish Task (Definition of Done) — @taedron/access

Work through every line. A task is not "done" until all boxes pass.

**This is a package, not an app** — no database, no build step. It is also the **auth
boundary for every Life Suite app**, so the bar here is higher than "it compiles".

> **Editing this repo at all needs owner confirmation.** If you got here as a side effect of
> app work, stop and surface it instead.

1. **Types:** `npm run typecheck` — must pass.
2. **Tests:** `npm run test` — must pass. Gate-decision changes need a test per branch.
3. **The decision table still holds.** State each explicitly; don't assume:

   | Case | Must still be true |
   |---|---|
   | valid JWT | `ok`, identity correct, `isAdmin` correct |
   | no / invalid / expired JWT | `unauthenticated` (401) — **never** pass-through |
   | wrong `aud` | rejected |
   | `CF_ACCESS_*` unset, production | `misconfigured` (503) — **fails CLOSED** |
   | `CF_ACCESS_*` unset, local | `disabled` |
   | spoofed plaintext email header | ignored entirely |

4. **Still edge-safe.** No Node-only API crept in — consumers call this from `middleware.ts`,
   which is the edge runtime. Web Crypto only (that's why it's `jose`).
5. **The plaintext header is still untrusted.** `ACCESS_EMAIL_HEADER` remains a convenience
   export and is never used for an auth decision.
6. **Public-repo hygiene:** no IPs, server names, ssh users or key names, deploy paths, or
   personal data. **AUD tags and the team domain are public identifiers and are fine**;
   tunnel tokens are not.

   Run the check rather than eyeballing it:
   ```bash
   node ../taedron-hub/scripts/suite-sync.mjs --write
   ```
   It refuses (exit 2) if anything destined for a public repo matches an infrastructure
   pattern. **The patterns themselves deliberately live in the hub's private
   `docs/suite/suite.config.json`** — writing them out here would put the very strings we're
   excluding into a public repo, which is exactly the mistake this step exists to catch.
7. **Docs:** `docs/DECISIONS.md` if an architectural choice was made; README if the public API
   changed.
8. **Changelog:** entries belong to a **release**. If not releasing, use an "Unreleased"
   heading rather than inventing a version.
9. **Suite sync:** `node ../taedron-hub/scripts/suite-sync.mjs` — resolve or surface drift.
10. **Merge to `main`:** work happened on a branch — **never commit directly to `main`.**
    Merge `--no-ff` only after 1–9 pass. **Ask before pushing.**
11. **Releasing is NOT part of this.** Version bump + tag is the `release` skill, with its own
    approval. Merging to `main` publishes nothing — consumers resolve tags.

Report completion only after every step passes, and say plainly whether a release was cut
(usually: no).
