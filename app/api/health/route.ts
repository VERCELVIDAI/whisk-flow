import { getDatabase } from "@/lib/db";
import { authMode } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import { logWarning, requestContext } from "@/lib/errors";

export async function GET(request: Request) {
  const context = requestContext(request, "health");
  try {
    const db = await getDatabase();
    await db.query("SELECT 1");
    return Response.json(
      {
        ok: true,
        authMode: authMode(),
        storageMode: storageMode(),
        time: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logWarning("Health check failed", {
      requestId: context.requestId,
      operation: "health",
      error: error instanceof Error ? error.name : typeof error,
    });
    return Response.json(
      {
        ok: false,
        database: "unavailable",
        code: "database_unavailable",
        message:
          "The studio database is not configured or reachable. Add DATABASE_URL to the deployment environment and redeploy.",
        requestId: context.requestId,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-ID": context.requestId,
        },
      },
    );
  }
}
