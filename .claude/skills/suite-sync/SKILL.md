---
name: suite-sync
description: Check this repo against the rest of the Life Suite — shared package versions, required files, and what changed in the other repos. Use at the start of suite-touching work, after any shared-package release, and before merging (finish-task runs it). Also regenerates each repo's docs/SUITE.md stub.
---

# Suite sync

The Life Suite is deliberately **separate repos** (suite decision S-001), so a change in one is
invisible to the others. This is what makes it visible.

Source of truth: `taedron-hub/docs/suite/`. This skill is byte-identical in every repo.

## Check (read-only — do this first)

```bash
node ../taedron-hub/scripts/suite-sync.mjs
```

From `taedron-hub` itself: `node scripts/suite-sync.mjs`.

Exit codes: **0** aligned · **1** drift · **2** refused to write (unreadable state, or a public repo
would have received infrastructure detail).

## Reading the output

| Signal | What it means | What to do |
|---|---|---|
| `behind — @taedron/ui 0.9.0 < 0.10.0` | this repo pins an older shared version | **Stop and surface it.** Adopting is a deliberate, per-app decision (S-004) — never a side effect of other work. |
| `missing — docs/…` | a required file for this repo kind isn't there | Create it, or fix `requiredFiles` in `suite.config.json` if the requirement is wrong. |
| `version bumped past latest tag` | a shared package's `package.json` is ahead of its newest tag | **Consumers cannot resolve it** — `github:…#vX.Y.Z` resolves a *tag*. Tag it or revert the bump. |
| `package.json UNREADABLE` | it exists but won't parse | Fix before trusting anything else in the report. |
| `N dirty`, `N unpushed`, `off main` | informational only | Not drift; doesn't fail the check. |

To adopt a new shared version (only when the owner has said so):

```bash
rm -rf node_modules/@taedron/ui && npm install "github:Taedron/taedron-ui#vX.Y.Z"
```

npm caches `github:` tags — a plain `npm install` silently reuses the old one. Then `rm -rf .next`,
because Next doesn't watch `node_modules`.

## After a suite-affecting change

A change is suite-affecting if it touches more than the repo you're in: a shared release or its
adoption, an app going `live`, a hostname change, a new suite decision, or a change to
`CONTRACTS.md`.

1. Append an entry to `taedron-hub/docs/suite/CHANGELOG.md` — `## YYYY-MM-DD — <what>` plus an
   `**Affects:**` line naming the repos that must act. Write it even when nobody must act;
   silence is what caused the drift in the first place.
2. Regenerate the stubs:
   ```bash
   node ../taedron-hub/scripts/suite-sync.mjs --write
   ```
3. Commit the regenerated `docs/SUITE.md` in each repo it changed. They're tracked on purpose —
   that's how a session in one repo learns what happened in another.

## Rules

- **`docs/SUITE.md` is generated.** Never hand-edit it; edit `taedron-hub/docs/suite/` and re-run.
- **Never edit or release `@taedron/ui` / `@taedron/access` from an app session.** Surface it and wait.
- **`taedron-ui` and `taedron-access` are PUBLIC.** No IPs, server names, ssh users or key names,
  deploy paths, or backup locations — ever (S-006). The generator refuses, but the rule is yours too.
