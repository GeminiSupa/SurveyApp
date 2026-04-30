import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "auth-refresh", 30, 60_000);
  if (!rateGuard.ok) return rateGuard.response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshToken = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("sb-refresh-token="))
    ?.split("=")[1];

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return NextResponse.json({ error: "Refresh failed." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("sb-access-token", data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  });
  response.cookies.set("sb-refresh-token", data.session.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
