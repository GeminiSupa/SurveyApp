import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type GuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse<{ error: string }> };

const rateStore = new Map<string, { count: number; resetAt: number }>();

function getAllowedOrigins() {
  const origins = new Set<string>();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ""));
  const extra = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (extra) {
    for (const raw of extra.split(",")) {
      const v = raw.trim();
      if (v) origins.add(v.replace(/\/$/, ""));
    }
  }
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");
  return origins;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function requireTrustedOrigin(request: Request): GuardResult {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") ?? null;
  const host = request.headers.get("host")?.replace(/\/$/, "") ?? null;
  const allowed = getAllowedOrigins();

  // Some navigations / same-origin / certain proxies may omit Origin.
  // In that case, fall back to Host-based allowlist to avoid blocking legitimate requests.
  if (!origin) {
    if (host && allowed.has(`https://${host}`)) return { ok: true };
    if (host && allowed.has(`http://${host}`)) return { ok: true };
    return { ok: false, response: NextResponse.json({ error: "Untrusted origin." }, { status: 403 }) };
  }
  if (!allowed.has(origin)) {
    return { ok: false, response: NextResponse.json({ error: "Untrusted origin." }, { status: 403 }) };
  }
  return { ok: true };
}

export function enforceRateLimit(request: Request, routeKey: string, maxRequests: number, windowMs: number): GuardResult {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${routeKey}:${ip}`;
  const current = rateStore.get(key);

  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= maxRequests) {
    return { ok: false, response: NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 }) };
  }

  current.count += 1;
  rateStore.set(key, current);
  return { ok: true };
}

export async function enforceReplayProtection(request: Request, route: string): Promise<GuardResult> {
  const requestId = request.headers.get("x-request-id");
  if (!requestId || requestId.length < 12 || requestId.length > 128) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing or invalid x-request-id header." }, { status: 400 }),
    };
  }

  const client = createAdminSupabaseClient();
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Security guard unavailable." }, { status: 500 }),
    };
  }

  const { error } = await client.from("request_replay_guards").insert({
    request_id: requestId,
    route,
  });
  if (error) {
    // Only block if it's a genuine unique-constraint violation (duplicate request)
    // code 23505 = unique_violation in Postgres
    if (error.code === "23505") {
      return { ok: false, response: NextResponse.json({ error: "Duplicate request detected." }, { status: 409 }) };
    }
    // For any other DB error, allow the request to proceed to avoid false positives
    console.warn("[ReplayGuard] Non-duplicate DB error, allowing request:", error.message);
  }

  return { ok: true };
}
