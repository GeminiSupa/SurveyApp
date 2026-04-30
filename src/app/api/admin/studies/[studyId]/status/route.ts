
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserId } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const { studyId } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminSupabaseClient();
    if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 500 });

    const { status } = await request.json();

    if (!["draft", "published", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await admin
      .from("studies")
      .update({ status })
      .eq("id", studyId);

    if (error) {
      console.error("Status Update DB Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("Status Update Critical Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
