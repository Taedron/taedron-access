# Linting

```bash
npm run lint          # errors fail, warnings are reported
npm run lint:strict   # --max-warnings 0, for clearing debt
```

**Status:** installed and passing. Zero errors, zero warnings. Wired into
`.github/workflows/ci.yml` after Typecheck, and into the `finish-task` checklist.

CI fails on **errors only**. The raw-palette rule has hundreds of pre-existing violations across
the suite, and a gate that always fails is one everyone learns to ignore. `lint:strict` is the
ratchet.

## Toolchain

| Package | Version | Note |
|---|---|---|
| `eslint` | ^10 | flat config only |
| `@eslint/js` | ^10 | `js.configs.recommended` |
| `typescript-eslint` | ^8 | correct alongside eslint 10 — it peers `^8.57 \|\| ^9 \|\| ^10`, and there is no v9/v10 of it |
| `eslint-plugin-react-hooks` | ^7 | **^7 is the first major that peers eslint 10.** ^6 fails to install |

Adds **no** vulnerabilities: the dev tree audits identically to the production tree.

## What is enforced, and why

Every rule below was chosen because this codebase had *already* violated it, or because the docs
asserted it and nothing checked. A generic recommended set would not have caught any of them.

- `taedron/no-process-env` — **off here, on purpose.** Reading Access configuration is this
  package's job, and `accessConfigFromEnv(env = process.env)` already takes the source as an
  injectable parameter — the right shape, and what makes it testable.

- `taedron/no-raw-palette` — **off here.** No components in this package.

- `no-console` — **error**, `warn`/`error` allowed. `src/lib/logger.ts` redacts secret-shaped
  fields and scrubs connection strings out of error messages; `console.log` bypasses both, and
  `DATABASE_URL` carries the database password.

- `react-hooks/rules-of-hooks` — **error**; `exhaustive-deps` — **warn**. Conditional or
  out-of-order hook calls are real runtime bugs that `tsc` cannot see.

- `@typescript-eslint/no-explicit-any` — **warn**. A shim for a third-party shape is sometimes
  the honest answer; `any` on our own types is not.

## What the first run actually caught

Worth recording, because it is the argument for having the linter at all:

- **An auth-gate hole.** `src/middleware.ts` had `favicon\.ico` inside a *string*, where
  `\.` is just `.` — so the negative lookahead read `favicon.ico` with `.` matching **any**
  character. `/faviconXico` and `/robotsXtxt` were excluded from the middleware, i.e. from the
  Access gate. Present in all six Next repos. `no-useless-escape` found it; the fix is `\\.`.
- **A literal BOM character** sitting in the middle of a regex in `suite-sync.mjs`, invisible in
  every editor. Now written `\uFEFF`.
- **Dead code**: 12 unused icon imports in one file, an unused helper plus the prop that fed it,
  two unused imports in migration scripts.
- **Two dead `eslint-disable` comments** naming rules no installed plugin defined
  (`@next/next/no-img-element`, `react-hooks/exhaustive-deps`) — they had been silencing
  nothing. ESLint 10 hard-errors on these, which is how they surfaced.
- **Two `no-useless-assignment`** findings where an initialiser was provably never read.

## Deliberately not type-aware

`recommendedTypeChecked` needs a TS program per run, and its `no-unsafe-*` rules fire on every
Prisma result and every `JSON.parse`. That is thousands of findings and a slow gate — which is
how a lint step becomes something everyone skips. `tsc --noEmit` already covers type
correctness; this covers what types cannot express.

## Two things the config must keep ignoring

- `**/.claude/**` — agent worktrees are full, usually **stale**, copies of the repo. Linting
  them reports every finding twice and resurrects issues already fixed on the real tree.
- `**/next-env.d.ts` — needs the `**/` prefix. A bare `next-env.d.ts` in flat-config
  `ignores` matches only the repo root, so nested copies still got linted.

## Duplication, acknowledged

This config is copied per repo rather than shared from a package. That is deliberate: the Life
Suite repos are separate on purpose so a change in one cannot break a session working in another,
and a shared `@taedron/eslint-config` would reintroduce exactly that coupling for tooling. If
the configs drift far enough to hurt, revisit it as its own decision.
