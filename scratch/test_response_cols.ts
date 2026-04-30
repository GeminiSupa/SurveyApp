
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function testResponseColumns() {
  const admin = createAdminSupabaseClient();
  if (!admin) return;

  const cols = ['id', 'study_id', 'participant_session_id', 'question_key', 'response_type', 'text_value', 'numeric_value', 'json_value', 'created_at'];
  
  for (const col of cols) {
    const { error } = await admin.from('responses').select(col).limit(1);
    if (error) {
      console.log(`Column '${col}' is MISSING`);
    } else {
      console.log(`Column '${col}' exists`);
    }
  }
}

testResponseColumns();
