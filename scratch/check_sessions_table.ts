
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function checkSessions() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data, error } = await admin.from('participant_sessions').select('*').limit(1);
  if (error) {
    console.error("Error querying participant_sessions:", JSON.stringify(error, null, 2));
  } else {
    console.log("Successfully queried participant_sessions. Table exists.");
  }
}

checkSessions();
