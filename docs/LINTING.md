# Linting

## Status: config committed, **not yet installed**

`eslint.config.mjs` is in this repo and reviewable, but the dev dependencies are not
installed, so `npm run lint` will fail with "eslint: not found" until you run:

```bash
npm install --save-dev eslint@^10 @eslint/js@^10 typescript-eslint@^8
```

That is the only step — the scripts are already in `package.json`.

`typescript-eslint@8` is correct alongside `eslint@10`: it declares
`"eslint": "^8.57.0 || ^9.0.0 || ^10.0.0"` as a peer and there is no v9 or v10 of it. The
mismatched majors look wrong and are not.

## ⚠️ The config has not been executed

ESLint could not be installed while this was written, so the rule logic was verified by other
means:

- the config file parses as valid ESM (`node --check`);
- the palette regex was tested against 44 class strings — 16 that must flag, 28 that must
  not, including the `bg-white-ish` false-positive case and the `bg-black/50` opacity case;
- the `process.env` rule's node predicate was checked against four synthetic AST shapes
  (`process.env`, `process.cwd`, `myEnv.env`, `process["env"]`).

Expect to fix a config-shape detail on the first real run. The rules themselves are sound, but
"it parses" is not "it runs".

## Why it shipped inert installing a dependency needs explicit approval in this setup, and
adding the packages to `package.json` without a matching `package-lock.json` would break
CI — `npm ci` fails hard when the two disagree. Committing the config separately keeps the
repo working and makes activation a single reviewed command.

## After installing

Add the step to `.github/workflows/ci.yml`, immediately after Typecheck:

```yaml
      - name: Lint
        run: npm run lint
```

Then add a line to `.claude/skills/finish-task/SKILL.md` so it becomes part of the
Definition of Done.

## What is enforced, and why

Everything below was chosen because the suite had *already* violated it somewhere, or
because the docs asserted it and nothing checked. A generic recommended set would not have
caught any of these.

- `taedron/no-process-env` — **off**. Reading Access configuration is this package's
  job, and `accessConfigFromEnv(env = process.env)` already takes the source as an
  injectable parameter, which is the right shape and what makes it testable.

- `no-restricted-syntax` → **no second `PrismaClient`**. The pool is per-instance, and
  Next's dev hot-reload makes a fresh one per reload until MySQL runs out of connections.
  `src/lib/db.ts` holds the singleton.

- `no-restricted-syntax` → **no cast on a `readJson()` result**. It returns `unknown`
  deliberately; casting asserts a shape nothing checked, which is exactly how an unvalidated
  request body reaches a service. Parse it with zod.

- `taedron/no-raw-palette` — **off**. No components in this package.

- `no-console` — **error**, `warn`/`error` allowed. `src/lib/logger.ts` redacts
  secret-shaped fields and scrubs connection strings out of error messages; `console.log`
  bypasses both, and `DATABASE_URL` carries the database password.

- `@typescript-eslint/no-explicit-any` — **warn**. A shim for a third-party shape is
  sometimes the honest answer; `any` on our own types is not.

## Deliberately not type-aware

`recommendedTypeChecked` needs a TS program per run, and its `no-unsafe-*` rules fire on
every Prisma result and every `JSON.parse`. That is thousands of findings and a slow gate —
which is how a lint step becomes something everyone skips. `tsc --noEmit` already covers
type correctness; this covers what types cannot express.

## Duplication, acknowledged

This config is copied per repo rather than shared from a package. That is deliberate: the
Life Suite repos are separate on purpose so a change in one cannot break a session working in
another, and a shared `@taedron/eslint-config` would reintroduce exactly that coupling for
tooling. If the configs drift far enough to hurt, revisit it as its own decision.
