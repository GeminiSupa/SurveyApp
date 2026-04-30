import { createAdminSupabaseClient } from "./src/lib/supabase/admin";

async function main() {
  const client = createAdminSupabaseClient();
  if (!client) return console.error("No client");

  const { data: b1 } = await client.from("study_blocks").select("*").eq("id", "survey_3254708f-f77f-4249-a779-00e673316b66");
  const { data: b2 } = await client.from("study_blocks").select("*").eq("id", "survey_42651872-5562-41de-84cd-67632f135332");
  
  console.log("Blocks:", b1, b2);

  const { data: q1 } = await client.from("survey_questions").select("*").limit(5);
  console.log("Q1 sample:", q1);
}
main();
