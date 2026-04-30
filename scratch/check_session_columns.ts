
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function checkSessionColumns() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data, error } = await admin.from('participant_sessions').select('*').limit(1);
  if (error) {
    console.error("Error querying sessions:", JSON.stringify(error, null, 2));
  } else {
    console.log("Session columns available:", Object.keys(data[0] || {}));
  }
}

checkSessionColumns();
