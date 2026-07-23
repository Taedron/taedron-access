# CLAUDE.md — read this first, every session

> ## ⚠️ SHARED PACKAGE — changes here ripple across the whole Life Suite
>
> `@taedron/access` is consumed by **every** Life Suite app and the hub via
> `github:Taedron/taedron-access#vX.Y.Z` version tags. The owner commonly runs
> **multiple Claude Code sessions at once**, one per app.
>
> **Before editing source or docs, or cutting a release (version bump + tag) in this
> repo, STOP and get explicit user confirmation.** A change or new tag here can break
> another session mid-task, and this package is the **auth boundary** for every app —
> a mistake here can lock people out or, worse, let the wrong people in. Do **not**
> edit or release it as a side effect of app work — surface it and wait.

## What this is

`@taedron/access` — Cloudflare Access identity for the suite. Verifies the signed
`Cf-Access-Jwt-Assertion` against the Zero Trust team JWKS (jose, edge-safe) and exposes
`checkAccess` (the fail-closed gate decision), `verifyAccessRequest`, and
`accessConfigFromEnv`. Ships **raw TypeScript** — consumers add it to `transpilePackages`.
Never trusts the plaintext `Cf-Access-Authenticated-User-Email` header.

## Commands

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (parse/decision-table tests; no network) |

Both must pass before any change is "done". Release flow mirrors `@taedron/ui`: bump
`version`, tag `vX.Y.Z`, and let each app adopt the new tag as a separate deliberate step.
