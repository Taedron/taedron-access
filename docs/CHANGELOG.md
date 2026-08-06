# Changelog — @taedron/access

Newest first. **Every entry is a released tag** — consumers resolve
`github:Taedron/taedron-access#vX.Y.Z`, which is a *tag*, so an untagged version bump is
unreachable and must never happen.

Back-filled on 2026-07-30 from the existing tags and the suite plan log.

This package is the **auth boundary** for every Life Suite app. A mistake here can lock
everyone out or let the wrong people in, so entries state the security consequence, not just
the API change.

---

## 2026-08-05 — ESLint installed and wired into CI

`npm run lint` / `npm run lint:strict`, running in CI after Typecheck and part of the
`finish-task` checklist. **Zero errors**, zero warnings.

Toolchain: `eslint@^10`, `@eslint/js@^10`, `typescript-eslint@^8`,
`eslint-plugin-react-hooks@^7`. Two version traps worth knowing: `typescript-eslint` has no v9
or v10 — v8 peers eslint `^10` and is correct; and `eslint-plugin-react-hooks@^6` will **not**
install against eslint 10, `^7` is the first major that peers it. Adds no vulnerabilities — the
dev tree audits identically to the production tree.

**Also found on the first run:** a literal BOM character inside a regex in `suite-sync.mjs`
(invisible in every editor, now `﻿`); two `eslint-disable` comments naming rules no
installed plugin defined, so they had been silencing nothing; 12 unused icon imports in one file;
an unused helper plus the prop that fed it; and two provably-dead initialisers.

CI gates on **errors only**. The raw-palette rule carries hundreds of pre-existing violations
across the suite, and a gate that always fails is one everyone learns to ignore. See
`docs/LINTING.md` for every rule and why it is set where it is.


## 2026-08-05 — ESLint config (inert)

`eslint.config.mjs` committed with `lint` / `lint:strict` scripts. **Inert until the dev
dependencies are installed** — see `docs/LINTING.md`. No source changes.

`taedron/no-process-env` is **off** in this repo on purpose: reading Access configuration is
this package's job, and `accessConfigFromEnv(env = process.env)` already takes the source as an
injectable parameter — which is the right shape and is what makes it testable.


## v0.2.0 — 2026-07-23 — `checkAccess` and fail-closed behaviour
- New `checkAccess(req)` returns exactly one of:
  - `ok` — verified identity, forwarded by the app as `x-user-email` / `x-user-admin`
  - `unauthenticated` — 401. **No password fallback**, deliberately.
  - `misconfigured` — 503. **Production with `CF_ACCESS_*` unset fails CLOSED.**
  - `disabled` — local dev, gate is a no-op.
- Roles via `SUITE_ADMIN_EMAILS`, because One-time PIN carries no group claim — there is
  nothing in the JWT to read. If a real IdP is added later, groups can replace this.
- **Security note:** `disabled` means local behaviour never proves production behaviour.
  A gate that works locally proves nothing about the deployed app.
- This is the release that let Decision 028 land: all three apps plus the hub deleted their
  password paths and dropped their credential tables on this version.

## v0.1.0 — 2026-07-23 — Verified Access identity
- Verifies the signed `Cf-Access-Jwt-Assertion` against the Zero Trust team JWKS using `jose`
  (Web Crypto, so it is edge-runtime safe — required, because apps call it from `middleware.ts`).
- **Deliberately does NOT trust `Cf-Access-Authenticated-User-Email`.** That header is
  plaintext and trivially spoofable by anything that can reach the origin. Verifying the
  signature means a spoofed header can never authenticate anyone, even if the origin ever
  becomes reachable by something other than the tunnel.
- `aud` binds the token to **one** Access application, so a token minted for another
  application in the same team cannot be replayed. This is why each app must use its own AUD
  and the hub must not use the `*.taedron.com` wildcard's.
