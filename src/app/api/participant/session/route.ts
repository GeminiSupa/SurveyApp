import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type SubmitPayload = {
  studyId: string;
  rating: number;
  consentAccepted: boolean;
};

export async function POST(request: Request) {
  const client = createAdminSupabaseClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase admin client not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<SubmitPayload> | null;
  if (!body?.studyId || !body.consentAccepted || !body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: study, error: studyError } = await client
    .from("studies")
    .select("id")
    .eq("public_id", body.studyId)
    .single();

  if (studyError || !study) {
    return NextResponse.json({ error: "Study not found." }, { status: 404 });
  }

  const { data: session, error: sessionError } = await client
    .from("participant_sessions")
    .insert({
      study_id: study.id,
      status: "completed",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  const { error: consentError } = await client.from("consents").insert({
    study_id: study.id,
    participant_session_id: session.id,
    consent_text_version: "v1",
    accepted: true,
  });

  if (consentError) {
    return NextResponse.json({ error: "Could not save consent." }, { status: 500 });
  }

  const { error: responseError } = await client.from("responses").insert({
    study_id: study.id,
    participant_session_id: session.id,
    question_key: "ease_of_first_interaction",
    response_type: "likert",
    numeric_value: body.rating,
  });

  if (responseError) {
    return NextResponse.json({ error: "Could not save response." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
