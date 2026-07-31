# Decisions — @taedron/access

Choices scoped to **this package**. Suite-wide decisions live in
`taedron-hub/docs/suite/DECISIONS.md` (`S-nnn`) — Decision 028, which made Cloudflare Access
the only login, is the one this package exists to implement.

---

## 001 — Verify the signed JWT, never the plaintext email header
**Date:** 2026-07-23 · **Status:** Accepted

The package verifies `Cf-Access-Jwt-Assertion` against the team JWKS. It exports
`ACCESS_EMAIL_HEADER` as a named constant but treats it as convenience only.

**Why:** `Cf-Access-Authenticated-User-Email` is plaintext. Anything that can reach the origin
can set it. Today the only ingress is the tunnel — but an auth boundary that depends on
network topology staying correct forever is not a boundary.

**Consequence:** consumers must never read that header. Verified in production: a spoofed
plaintext header returns 401, a garbage JWT returns 401.

---

## 002 — Fail closed in production, no-op in local dev
**Date:** 2026-07-23 · **Status:** Accepted

`checkAccess` returns `misconfigured` (503) when `CF_ACCESS_*` is unset in production, and
`disabled` (pass-through) when unset locally.

**Why:** a missing config in production must never silently become "everyone is authorised".
Locally, requiring real Access config would make the apps undevelopable offline.

**Consequence — the sharp edge:** **local behaviour does not prove production behaviour.** A
gate that appears to work on a workstation proves nothing about the deployed app. This is
worth repeating in every consuming app's docs, and it is.

---

## 003 — `aud` binds a token to exactly one application
**Date:** 2026-07-23 · **Status:** Accepted

Verification requires the Access application's Audience tag.

**Why:** without it, a token minted for *any* application in the same Zero Trust team would
verify against *any other*. The suite has two applications — the `*.taedron.com` wildcard and
the hub's own — so this is a live concern, not a theoretical one.

**Consequence:** each app must configure **its own** AUD. Using the wrong one fails silently
by authenticating against the wrong application. AUD tags are public identifiers, readable
from the `meta` param of the login redirect — they are not secrets, so they may appear in
docs and compose files.

---

## 004 — Roles live in env, not the token
**Date:** 2026-07-23 · **Status:** Accepted, expected to be superseded

`isAdmin` is derived from `SUITE_ADMIN_EMAILS`.

**Why:** the login method is One-time PIN, which carries **no group claim** — there is nothing
in the JWT to read. This is a limitation of the identity provider, not a design preference.

**Consequence:** admin changes need a redeploy or env update per app rather than a dashboard
change. If a real IdP is added later, groups can flow into the token and replace this
entirely — write that migration rather than extending the env list.

---

## 005 — Edge-runtime safe via `jose`
**Date:** 2026-07-23 · **Status:** Accepted

`jose` uses Web Crypto, so verification runs in Next.js middleware.

**Why:** the gate has to run before the request reaches a route, which means the edge runtime —
Node-only crypto libraries are unusable there.

**Consequence:** edge middleware **cannot reach a database**. Any app needing a DB lookup at
login must hand off to a node-runtime route; LifePricer's `/api/auth/access` is the pattern.
That carve-out has a known trap: the `/login` passthrough must precede the hand-off and the
hand-off route must be excluded from the matcher, or it redirect-loops forever.
