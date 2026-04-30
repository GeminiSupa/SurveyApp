
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function testInsertSession() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  // Get a study ID
  const { data: study } = await admin.from('studies').select('id').limit(1).single();
  if (!study) {
    console.error("No study found to test with");
    process.exit(1);
  }

  console.log("Testing insert into participant_sessions for study:", study.id);

  const { data, error } = await admin
    .from('participant_sessions')
    .insert({ study_id: study.id, status: 'in_progress' })
    .select()
    .single();

  if (error) {
    console.error("Session insert failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("Session insert succeeded:", data);
  }
}

testInsertSession();
