import { assertSameOrigin, readJson } from "@/lib/api";
import { errorResponse, AppError } from "@/lib/errors";
import { registerSchema } from "@/lib/validation";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { authMode, getCurrentUser } from "@/lib/auth";
import { registerLocal } from "@/lib/auth/local";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { appUrl } from "@/lib/config";
import { seedWelcomeContent } from "@/lib/demo";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    checkRateLimit({ key: clientKey(request, "register"), limit: 8, windowMs: 60_000 });
    const input = registerSchema.parse(await readJson(request));

    if (authMode() === "supabase") {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName },
          emailRedirectTo: `${appUrl()}/auth/callback?next=/`,
        },
      });
      if (error) {
        throw new AppError(400, "signup_failed", error.message);
      }
      if (data.session) {
        const user = await getCurrentUser();
        if (user) await seedWelcomeContent(user.id);
      }
      return Response.json({
        ok: true,
        requiresVerification: !data.session,
        message: data.session
          ? "Your studio is ready."
          : "Check your inbox to verify your email, then sign in.",
      });
    }

    const user = await registerLocal(input);
    await seedWelcomeContent(user.id);
    return Response.json({ ok: true, requiresVerification: false, user });
  } catch (error) {
    return errorResponse(error);
  }
}
