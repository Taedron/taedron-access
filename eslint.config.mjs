import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * ESLint, flat config.
 *
 * ## Why this exists
 *
 * The 2026-08-05 security audit found no linter in any repo — quality gates were
 * `test` + `typecheck` only. More usefully, it found several rules the docs
 * already state but nothing enforced, each of which had been violated somewhere
 * in the suite. Those are the `taedron/*` rules below. A generic recommended set
 * would not have caught any of them.
 *
 * ## Deliberately NOT type-aware
 *
 * `recommendedTypeChecked` needs a TS program per lint run and its
 * `no-unsafe-*` rules fire on every Prisma result and every `JSON.parse`. On a
 * codebase this size that is thousands of findings and a slow gate — which is
 * how a lint step becomes something everyone passes with `--no-verify`. Start
 * strict about a few things that matter, not vaguely strict about everything.
 *
 * ## Severity policy
 *
 * `error` for anything that is a real defect or a security regression.
 * `warn` for pre-existing debt being ratcheted down — currently only the raw
 * palette rule, which has hundreds of existing violations across the suite.
 * `npm run lint` therefore passes today; `npm run lint:strict` treats warnings
 * as errors and is what to run when clearing that debt.
 *
 * ## The local plugin
 *
 * Two custom rules are defined inline rather than pulled from a package. They
 * are ~15 lines each, need no dependency, and can carry a message that explains
 * the specific trap. `no-restricted-syntax` could express them, but it cannot
 * give them separate severities — and the palette rule has to be a warning while
 * the others are errors.
 */

/**
 * The trailing `(?![-\w])` is load-bearing: a plain `\b` also matches before a
 * hyphen, so `bg-white-ish` (a perfectly valid custom class) would be reported
 * as `bg-white`. An opacity suffix like `bg-black/50` must still be caught, so
 * the lookahead excludes only `-` and word characters, not `/`.
 */
const PALETTE =
  /\b(?:bg|text|border|ring|divide|from|via|to|outline|decoration|placeholder|caret|accent|shadow)-(?:white|black|slate|gray|grey|zinc|neutral|stone)(?:-\d{2,3})?(?![-\w])/;

const taedron = {
  rules: {
    /**
     * The env layer is only worth having if it is the single entry point.
     * A stray `process.env.FOO` is unvalidated, undocumented, invisible to
     * `.env.example`, and will not fail the boot when it goes missing.
     */
    "no-process-env": {
      meta: {
        type: "problem",
        docs: { description: "Read configuration through src/lib/env.ts, not process.env" },
        schema: [],
        messages: {
          banned:
            "Read configuration from `env` in src/lib/env.ts, not process.env directly. " +
            "Add the variable to the schema there (and to .env.example) so it is validated at boot.",
        },
      },
      create(context) {
        return {
          MemberExpression(node) {
            if (
              node.object.type === "Identifier" &&
              node.object.name === "process" &&
              node.property.type === "Identifier" &&
              node.property.name === "env"
            ) {
              context.report({ node, messageId: "banned" });
            }
          },
        };
      },
    },

    /**
     * @taedron/ui Decision 004: consumers use semantic tokens (`bg-surface`,
     * `text-fg-secondary`, `btn-primary`), never raw palette utilities. Raw
     * utilities do not follow the theme, so they look right in whichever mode
     * the author was in and wrong in the other — a silent, cosmetic failure that
     * no test catches.
     */
    "no-raw-palette": {
      meta: {
        type: "suggestion",
        docs: { description: "Use @taedron/ui semantic tokens, not raw Tailwind palette utilities" },
        schema: [],
        messages: {
          raw:
            'Raw Tailwind palette utility "{{match}}" — use an @taedron/ui semantic token ' +
            "(bg-surface, bg-surface-2, text-fg, text-fg-secondary, border-line, btn-primary). " +
            "Raw palette classes ignore the theme, so they are wrong in one of the two modes. " +
            "(@taedron/ui Decision 004)",
        },
      },
      create(context) {
        const check = (node, value) => {
          if (typeof value !== "string") return;
          const m = PALETTE.exec(value);
          if (m) context.report({ node, messageId: "raw", data: { match: m[0] } });
        };
        return {
          Literal(node) {
            check(node, node.value);
          },
          TemplateElement(node) {
            check(node, node.value.cooked ?? node.value.raw);
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "src/generated/**",
      "prisma/generated/**",
      "next-env.d.ts",
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    plugins: { taedron },
    rules: {
      // ── the suite's own rules ───────────────────────────────────────────────
      // OFF here, on purpose. This package's whole job is to read Access
      // configuration, and `accessConfigFromEnv(env = process.env)` takes the
      // source as an injectable parameter — which is already the right shape and
      // is what makes it testable. There is no env.ts to point people at.
      "taedron/no-process-env": "off",
      // No components in this package.
      "taedron/no-raw-palette": "off",

      // Neither app rule applies: no Prisma, no API routes.

      // ── general ─────────────────────────────────────────────────────────────
      // pino is configured with redaction and secret scrubbing; console.log
      // bypasses both. warn/error are allowed for pre-logger boot failures.
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // A shim for a third-party shape is sometimes the honest answer; an `any`
      // on our own code is not. Warn so it shows up in review without blocking.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    files: ["*.config.{ts,mjs,js}"],
    rules: { "no-console": "off" },
  },

  // Tests: allow console, allow stubbing the environment, allow non-null
  // assertions on fixtures the test itself just built.
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "taedron/no-process-env": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
