import { assertSameOrigin, readJson } from "@/lib/api";
import { errorResponse, AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { authMode } from "@/lib/auth";
import { loginLocal } from "@/lib/auth/local";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { seedWelcomeContent } from "@/lib/demo";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    checkRateLimit({ key: clientKey(request, "login"), limit: 12, windowMs: 60_000 });
    const input = loginSchema.parse(await readJson(request));

    if (authMode() === "supabase") {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error || !data.user) {
        throw new AppError(401, "invalid_credentials", "The email or password is incorrect.");
      }
      await seedWelcomeContent(data.user.id);
      return Response.json({ ok: true });
    }

    const user = await loginLocal(input.email, input.password);
    await seedWelcomeContent(user.id);
    return Response.json({ ok: true, user });
  } catch (error) {
    return errorResponse(error);
  }
}
