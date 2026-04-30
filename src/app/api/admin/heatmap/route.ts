import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUserId } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "first_click";

  const { data, error } = await supabase
    .from("events")
    .select("payload")
    .eq("event_type", type)
    .order("event_time", { ascending: false })
    .limit(800);

  if (error) return NextResponse.json({ error: "Heatmap query failed." }, { status: 500 });

  const points = (data ?? [])
    .map((row) => {
      const x = Number((row.payload as any)?.xNorm);
      const y = Number((row.payload as any)?.yNorm);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return { x, y };
    })
    .filter(Boolean);

  return NextResponse.json({ points });
}
