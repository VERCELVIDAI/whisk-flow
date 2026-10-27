import { afterEach, describe, expect, it, vi } from "vitest";
import { api, errorMessage } from "@/lib/client-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("client API error handling", () => {
  it("turns a fetch failure into a network-specific message", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    );
  });

  it("uses the server message, code and correlation ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "auth_not_configured",
              message: "Sign-in is temporarily unavailable.",
              requestId: "req-12345678",
            },
          }),
          { status: 503 },
        ),
      ),
    );

    await expect(api("/api/auth/login")).rejects.toMatchObject({
      status: 503,
      code: "auth_not_configured",
      message: "Sign-in is temporarily unavailable.",
      requestId: "req-12345678",
    });
  });

  it("uses a safe fallback when a 5xx response is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })),
    );

    await expect(api("/api/auth/login")).rejects.toMatchObject({
      status: 502,
      code: "request_failed",
      message: "We couldn't complete your request. Please try again later.",
    });
  });
});
