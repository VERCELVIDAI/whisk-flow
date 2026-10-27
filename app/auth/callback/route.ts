import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { logWarning } from "@/lib/errors";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "recovery" | "invite" | "email_change" | "email",
      });
      if (error) throw error;
    }
    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    logWarning("Supabase auth callback failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(
      new URL("/login?error=Could%20not%20complete%20sign-in.%20Try%20again.", url.origin),
    );
  }
}
