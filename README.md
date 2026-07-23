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

```ts
import { verifyAccessRequest, accessConfigFromEnv } from "@taedron/access";

export async function middleware(req: NextRequest) {
  const cfg = accessConfigFromEnv();
  if (!cfg) return NextResponse.next();          // local dev: Access not configured
  const identity = await verifyAccessRequest(req, cfg);
  if (!identity) return new NextResponse("Unauthorized", { status: 401 });
  // identity.email is verified — safe to key users on
}
```

## Environment

| Variable | Meaning |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `taedron` or `taedron.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | The Access application's **Application Audience (AUD) tag** |

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
