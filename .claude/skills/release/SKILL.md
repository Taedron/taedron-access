---
name: release
description: Cut a new @taedron/access version — bump, merge, tag, push, and tell the suite. Use for "release", "cut a version", "tag v0.3.0". REQUIRES explicit owner approval before starting.
---

# Release @taedron/access

> ## ⛔ STOP — this needs explicit owner approval
>
> This package is the **auth boundary for every Life Suite app**. A bad tag here can lock
> everyone out of every app, or let the wrong people in. It is also consumed by sessions
> running in parallel on other apps.
>
> **Never release as a side effect of app work.** Confirm the owner wants a release, right
> now, before running step 1.

## Before you start

- This repo is **PUBLIC**. No IPs, server names, ssh users or key names, deploy paths, or
  personal data — in code, comments, examples, or commit messages (S-006).
- Consumers resolve a **tag**, not `package.json`. A version bump without a matching tag is
  unreachable — `suite-sync` flags this explicitly.

## Steps

1. **Branch and change.** `feature/…`; `npm run typecheck` **and** `npm run test` must pass.
2. **Reason about the failure modes explicitly.** For any change to the gate, state what
   happens in each case before you tag:

   | Case | Must still be true |
   |---|---|
   | valid JWT | `ok`, identity correct, `isAdmin` correct |
   | no / invalid / expired JWT | `unauthenticated` (401) — **never** pass-through |
   | wrong `aud` | rejected — a token for another app must not verify here |
   | `CF_ACCESS_*` unset, production | `misconfigured` (503) — **fails CLOSED** |
   | `CF_ACCESS_*` unset, local | `disabled` — and this proves nothing about production |
   | spoofed plaintext email header | ignored entirely |

3. **Changelog.** `docs/CHANGELOG.md` before tagging — state the **security** consequence,
   not just the API change.
4. **Decisions.** Architectural choices → `docs/DECISIONS.md`, or
   `taedron-hub/docs/suite/DECISIONS.md` if suite-wide.
5. **Bump + merge.** Bump `version`, commit, merge to `main` (`--no-ff`), push.
6. **Tag.** `git tag vX.Y.Z && git push origin vX.Y.Z` — **this is the step that publishes.**
7. **Verify it resolves:** `git ls-remote --tags origin | grep vX.Y.Z`.
8. **Tell the suite.** Append to `taedron-hub/docs/suite/CHANGELOG.md` with an `**Affects:**`
   line, then `node ../taedron-hub/scripts/suite-sync.mjs --write` and commit the stubs.

## After adoption, verify in production

A change to this package is not proven until checked against the deployed app — local dev
returns `disabled`, which exercises none of the real paths:

- unauthenticated request → 401
- `/api/health` → still reachable (it is excluded from the matcher on purpose)
- a spoofed `Cf-Access-Authenticated-User-Email` → 401
- a garbage `Cf-Access-Jwt-Assertion` → 401

## Adoption is NOT part of this

Each consumer bumps its own pinned tag as a separate deliberate decision (S-004). Do not
update the apps in the same session.
