import { assertSameOrigin } from "@/lib/api";
import { errorResponse, requestContext } from "@/lib/errors";
import { authMode } from "@/lib/auth";
import { clearLocalSession } from "@/lib/auth/local";
import { createSupabaseServerClient } from "@/lib/auth/supabase";

export async function POST(request: Request) {
  const context = requestContext(request, "auth.logout");
  try {
    assertSameOrigin(request);
    if (authMode() === "supabase") {
      const supabase = await createSupabaseServerClient();
      try {
        await supabase.auth.signOut();
      } catch (error) {
        // Signing out an already-expired session is still a successful logout.
        if (!(error instanceof Error && /AuthSessionMissing/i.test(error.name))) {
          throw error;
        }
      }
    }
    // Clear the local cookie in both modes. Switching from local to Supabase
    // can leave a stale wf_session cookie behind; logout must remove it too.
    await clearLocalSession();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, context);
  }
}
