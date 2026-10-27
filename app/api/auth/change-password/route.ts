import { z } from "zod";
import { assertSameOrigin, readJson } from "@/lib/api";
import { errorResponse, AppError } from "@/lib/errors";
import { passwordSchema } from "@/lib/validation";
import { requireApiUser } from "@/lib/auth";
import { changeLocalPassword } from "@/lib/auth/local";
import { createSupabaseServerClient } from "@/lib/auth/supabase";

const schema = z.object({
  currentPassword: z.string().max(128).optional().default(""),
  newPassword: passwordSchema,
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const input = schema.parse(await readJson(request));
    if (user.authMode === "supabase") {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({ password: input.newPassword });
      if (error) throw new AppError(400, "password_change_failed", error.message);
    } else {
      await changeLocalPassword(user.id, input.currentPassword, input.newPassword);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
