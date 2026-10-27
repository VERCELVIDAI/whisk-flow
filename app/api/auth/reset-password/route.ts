import { z } from "zod";
import { assertSameOrigin, readJson } from "@/lib/api";
import { errorResponse, AppError } from "@/lib/errors";
import { passwordSchema, resetPasswordSchema } from "@/lib/validation";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { authMode, getCurrentUser } from "@/lib/auth";
import { resetLocalPassword } from "@/lib/auth/local";
import { createSupabaseServerClient } from "@/lib/auth/supabase";

const supabaseResetSchema = z.object({ password: passwordSchema });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    checkRateLimit({ key: clientKey(request, "reset"), limit: 8, windowMs: 60_000 });
    const body = await readJson(request);

    if (authMode() === "supabase") {
      const user = await getCurrentUser();
      if (!user) {
        throw new AppError(401, "reset_session_required", "Open the reset link from your email first.");
      }
      const input = supabaseResetSchema.parse(body);
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({ password: input.password });
      if (error) throw new AppError(400, "reset_failed", error.message);
      return Response.json({ ok: true });
    }

    const input = resetPasswordSchema.parse(body);
    await resetLocalPassword(input.token, input.password);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
