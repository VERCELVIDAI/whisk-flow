import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorResponse, requestContext } from "@/lib/errors";

beforeEach(() => {
  // Validation and auth failures are expected in these tests. Keep the test
  // output readable while still allowing individual tests to assert on logs.
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorResponse", () => {
  it("returns an actionable 503 for database setup failures", async () => {
    const error = new Error("Supabase Auth is configured but DATABASE_URL is missing.");
    error.name = "DatabaseUnavailableError";

    const response = errorResponse(error);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "database_unavailable",
        message: "Supabase Auth is configured but DATABASE_URL is missing.",
      },
    });
  });

  it("does not leak unknown errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = errorResponse(new Error("secret internal detail"));
    expect(response.status).toBe(500);
    const payload = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(payload.error).toMatchObject({
      code: "internal_error",
      message: "We couldn't complete your request. Please try again later.",
    });
    expect(JSON.stringify(payload)).not.toContain("secret internal detail");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("maps a missing AUTH_SECRET to an actionable 503", async () => {
    const response = errorResponse(new Error("AUTH_SECRET must be configured in production."));
    expect(response.status).toBe(503);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("auth_not_configured");
    expect(payload.error.message).toMatch(/AUTH_SECRET|authentication secret/);
    expect(payload.error.message).not.toContain("must be configured in production");
  });

  it("maps invalid database text to a 422 instead of a generic 500", async () => {
    const response = errorResponse(
      new Error('invalid byte sequence for encoding "UTF8": 0x00'),
    );
    expect(response.status).toBe(422);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("invalid_text");
    expect(payload.error.message).not.toContain("0x00");
  });

  it("maps connection failures to a safe 503", async () => {
    const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });
    const response = errorResponse(error);
    expect(response.status).toBe(503);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("database_unavailable");
    expect(payload.error.message).not.toContain("127.0.0.1");
  });

  it("maps unique violations to a 409", async () => {
    const error = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
    });
    const response = errorResponse(error);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "conflict" },
    });
  });

  it("adds a correlation ID and logs operation, category and status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-request-id": "req-test-12345678" },
    });
    const response = errorResponse(new Error("boom"), requestContext(request, "auth.login"));

    expect(response.headers.get("x-request-id")).toBe("req-test-12345678");
    const payload = (await response.json()) as { error: { requestId: string } };
    expect(payload.error.requestId).toBe("req-test-12345678");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[whisk-flow] API error",
      expect.objectContaining({
        requestId: "req-test-12345678",
        operation: "auth.login",
        category: "unexpected",
        status: 500,
        code: "internal_error",
      }),
    );
  });

  it("generates a correlation ID and ignores malformed request IDs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-request-id": "short" },
    });
    const response = errorResponse(new Error("boom"), requestContext(request, "auth.login"));
    const requestId = response.headers.get("x-request-id");
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    const payload = (await response.json()) as { error: { requestId: string } };
    expect(payload.error.requestId).toBe(requestId);
  });

  it("redacts emails and tokens from diagnostic logs", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    errorResponse(new Error("failed for user@example.com with token sbp_abcdefghijklmnop"));
    const meta = consoleSpy.mock.calls[0]?.[1] as { message: string };
    expect(meta.message).not.toContain("user@example.com");
    expect(meta.message).not.toContain("sbp_abcdefghijklmnop");
  });
});
