import { NextResponse } from "next/server";
import { enforceRateLimit, requireTrustedOrigin } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  const originGuard = requireTrustedOrigin(request);
  if (!originGuard.ok) return originGuard.response;
  const rateGuard = enforceRateLimit(request, "auth-logout", 20, 60_000);
  if (!rateGuard.ok) return rateGuard.response;

  const origin = new URL(request.url).origin;
  const response = NextResponse.json({ ok: true, redirectTo: `${origin}/auth/login` });
  response.cookies.set("sb-access-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("sb-refresh-token", "", { path: "/", maxAge: 0 });
  return response;
}
