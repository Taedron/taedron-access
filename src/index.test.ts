import { describe, expect, it } from "vitest";
import { checkAccess, parseAdminEmails, verifyAccessJwt } from "./index";

const CONFIGURED = {
  CF_ACCESS_TEAM_DOMAIN: "taedron",
  CF_ACCESS_AUD: "aud-tag",
};

/** A request with no Access headers — the unauthenticated case. */
const bareRequest = { headers: { get: () => null } };

describe("parseAdminEmails", () => {
  it("splits on commas, semicolons, and whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@x.com; c@x.com d@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
      "d@x.com",
    ]);
  });

  it("lowercases and de-duplicates", () => {
    expect(parseAdminEmails("Noah@X.com,noah@x.com")).toEqual(["noah@x.com"]);
  });

  it("treats missing or empty as nobody", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("  ,  ; ")).toEqual([]);
  });
});

describe("checkAccess", () => {
  it("fails CLOSED in production when Access is not configured", async () => {
    const r = await checkAccess(bareRequest, { env: {}, isProduction: true });
    expect(r.status).toBe("misconfigured");
  });

  it("stays usable in dev when Access is not configured", async () => {
    const r = await checkAccess(bareRequest, { env: {}, isProduction: false });
    expect(r.status).toBe("disabled");
  });

  it("rejects a request with no token once Access IS configured", async () => {
    const r = await checkAccess(bareRequest, { env: CONFIGURED, isProduction: true });
    expect(r.status).toBe("unauthenticated");
  });

  it("does not fall back to 'disabled' just because a token is missing", async () => {
    // Regression guard: a missing token must never be mistaken for
    // "Access isn't set up", which would serve the app unguarded.
    const r = await checkAccess(bareRequest, { env: CONFIGURED, isProduction: false });
    expect(r.status).toBe("unauthenticated");
  });
});

describe("verifyAccessJwt", () => {
  it("returns null for a missing token without touching the network", async () => {
    expect(await verifyAccessJwt(null, { teamDomain: "taedron", aud: "aud-tag" })).toBeNull();
    expect(await verifyAccessJwt("", { teamDomain: "taedron", aud: "aud-tag" })).toBeNull();
  });

  it("returns null rather than throwing on a malformed token", async () => {
    expect(await verifyAccessJwt("not-a-jwt", { teamDomain: "taedron", aud: "aud-tag" })).toBeNull();
  });
});
