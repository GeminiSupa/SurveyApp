
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function check() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data, error } = await admin.from('organizations').select('id').limit(1);
  if (error) {
    console.error("Error querying organizations:", error);
  } else {
    console.log("Successfully queried organizations. Table exists.");
  }
}

check();
