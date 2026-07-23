# @taedron/access

Cloudflare Access identity for the Taedron Life Suite.

Verifies the **signed** `Cf-Access-Jwt-Assertion` header against the Zero Trust
team's JWKS. It deliberately does *not* trust the plaintext
`Cf-Access-Authenticated-User-Email` header — that header is only safe while the
origin is unreachable except through the tunnel, and this package is what makes
the apps safe regardless.

Ships **raw TypeScript**, like `@taedron/ui`. Consumers must add it to
`transpilePackages`.

## Install

```
npm i "github:Taedron/taedron-access#v0.1.0"
```

`next.config.ts`:

```ts
transpilePackages: ["@taedron/ui", "@taedron/access"],
```

## Use (middleware)

`checkAccess` folds config loading, verification, and the fail-closed
production rule into one decision, so no app re-derives the policy:

```ts
import { checkAccess } from "@taedron/access";

export async function middleware(req: NextRequest) {
  const check = await checkAccess(req);
  switch (check.status) {
    case "misconfigured":                          // prod with no CF_ACCESS_* → fail CLOSED
      return new NextResponse("Access not configured", { status: 503 });
    case "unauthenticated":                        // configured, token missing/invalid
      return new NextResponse("Unauthorized", { status: 401 });
    case "disabled":                               // local dev
      return NextResponse.next();
    case "ok": {
      const headers = new Headers(req.headers);
      headers.set("x-user-email", check.identity.email);   // verified
      headers.set("x-user-admin", String(check.identity.isAdmin));
      return NextResponse.next({ request: { headers } });
    }
  }
}
```

The lower-level `verifyAccessJwt` / `verifyAccessRequest` / `accessConfigFromEnv`
remain exported for callers that need the pieces (e.g. re-verifying inside a
route handler).

## Environment

| Variable | Meaning |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `taedron` or `taedron.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | The Access application's **Application Audience (AUD) tag** |
| `SUITE_ADMIN_EMAILS` | Emails granted admin rights, comma/space separated. Optional — empty means nobody is admin |

Roles live in env rather than in the token because One-time PIN carries no group
claim: there would be nothing in the JWT to read. If a real identity provider is
added later (Google, GitHub), group membership can flow into the token and
replace `SUITE_ADMIN_EMAILS`.

The AUD tag binds a token to one specific Access application, so a token minted
for a different app in the same team cannot be replayed. Find it in Zero Trust →
Access → Applications → *your app* → Overview.

**Apps behind the same Access application share an AUD.** The `*.taedron.com`
wildcard application covers pricer/estate/ledgr, so those three use the same
value; the hub has its own application and its own AUD.

## Behaviour

`verifyAccessJwt` never throws. Any failure — missing, malformed, expired,
wrong signature, wrong issuer, wrong audience — returns `null`, which callers
treat as "not authenticated".

Edge-runtime safe: `jose` uses Web Crypto, so this works from `middleware.ts`.
