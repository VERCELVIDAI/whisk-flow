import { afterEach, describe, expect, it, vi } from "vitest";

type GlobalDb = typeof globalThis & {
  __whiskFlowDb?: unknown;
};

describe("local auth configuration preflight", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reports the session secret as unavailable when production Vercel has no AUTH_SECRET", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("AUTH_SECRET", "");

    const { authSecretAvailable } = await import("@/lib/auth/crypto");
    await expect(authSecretAvailable()).resolves.toBe(false);
  });

  it("rejects registration with an actionable 503 before touching the database", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("AUTH_SECRET", "");
    const before = (globalThis as GlobalDb).__whiskFlowDb;

    const { registerLocal } = await import("@/lib/auth/local");
    await expect(
      registerLocal({
        fullName: "No Secret",
        email: "no-secret@example.test",
        password: "GoodPass123",
      }),
    ).rejects.toMatchObject({ status: 503, code: "auth_not_configured" });

    // The preflight must fail before the database is opened, so no profile or
    // credential can be created without a usable session secret.
    expect((globalThis as GlobalDb).__whiskFlowDb).toBe(before);
  });

  it("accepts a configured 32+ character secret", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("AUTH_SECRET", "x".repeat(40));

    const { authSecretAvailable } = await import("@/lib/auth/crypto");
    await expect(authSecretAvailable()).resolves.toBe(true);
  });
});
