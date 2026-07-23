/**
 * Cloudflare Access identity for Life Suite apps.
 *
 * Every request that reaches an app's origin has already passed through
 * Cloudflare Access, which attaches a signed JWT as the
 * `Cf-Access-Jwt-Assertion` header. This module VERIFIES that signature
 * rather than trusting the plaintext `Cf-Access-Authenticated-User-Email`
 * header, so a spoofed header can never authenticate anyone even if the
 * origin ever becomes reachable by something other than the tunnel.
 *
 * Edge-runtime safe (jose uses Web Crypto), which matters because these apps
 * call it from `middleware.ts`.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/** Header Cloudflare Access attaches to every authenticated request. */
export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

/** Plaintext email header. Convenience only — NEVER trust it for auth. */
export const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";

export type AccessIdentity = {
  /** Verified email of the authenticated user. Always lowercased. */
  email: string;
  /** Cloudflare's stable user id (the JWT `sub`). */
  userId: string;
};

export type AccessConfig = {
  /**
   * Zero Trust team domain. Accepts either the bare team name ("taedron")
   * or the full host ("taedron.cloudflareaccess.com").
   */
  teamDomain: string;
  /**
   * Application Audience (AUD) tag of the Access application guarding this
   * app. Binds the token to THIS app so a token minted for another
   * application in the same team cannot be replayed here.
   */
  aud: string;
};

/**
 * One JWKS fetcher per team domain, cached at module scope. jose handles the
 * HTTP caching and key rotation internally; constructing a new set per
 * request would refetch the keys every time.
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function normalizeTeamHost(teamDomain: string): string {
  const t = teamDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return t.includes(".") ? t : `${t}.cloudflareaccess.com`;
}

function getJwks(teamDomain: string) {
  const host = normalizeTeamHost(teamDomain);
  let set = jwksCache.get(host);
  if (!set) {
    set = createRemoteJWKSet(new URL(`https://${host}/cdn-cgi/access/certs`));
    jwksCache.set(host, set);
  }
  return set;
}

/**
 * Verify a raw Cf-Access-Jwt-Assertion token.
 * Returns the identity, or null if the token is missing, malformed, expired,
 * signed by the wrong key, or issued for a different application.
 *
 * Never throws — callers treat null as "not authenticated".
 */
export async function verifyAccessJwt(
  token: string | null | undefined,
  config: AccessConfig,
): Promise<AccessIdentity | null> {
  if (!token) return null;
  const host = normalizeTeamHost(config.teamDomain);

  try {
    const { payload } = await jwtVerify(token, getJwks(host), {
      issuer: `https://${host}`,
      audience: config.aud,
    });
    return identityFromPayload(payload);
  } catch {
    // Signature/issuer/audience/expiry failures all land here. Deliberately
    // opaque: the caller only needs "not authenticated".
    return null;
  }
}

function identityFromPayload(payload: JWTPayload): AccessIdentity | null {
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const userId = typeof payload.sub === "string" ? payload.sub : "";
  if (!email) return null;
  return { email, userId };
}

/** Minimal shape shared by NextRequest and the Fetch API Request. */
type HeaderBag = { headers: { get(name: string): string | null } };

/**
 * Verify the Access identity carried by a request.
 * Convenience wrapper over {@link verifyAccessJwt}.
 */
export async function verifyAccessRequest(
  req: HeaderBag,
  config: AccessConfig,
): Promise<AccessIdentity | null> {
  return verifyAccessJwt(req.headers.get(ACCESS_JWT_HEADER), config);
}

/**
 * Read Access config from the environment.
 * Returns null when either value is missing, which callers should treat as
 * "Access is not configured" — fail closed in production, open in local dev.
 */
export function accessConfigFromEnv(env: Record<string, string | undefined> = process.env): AccessConfig | null {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const aud = env.CF_ACCESS_AUD?.trim();
  if (!teamDomain || !aud) return null;
  return { teamDomain, aud };
}
