
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function checkStudies() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  // Check studies columns
  const { data, error } = await admin.from('studies').select('*').limit(1);
  if (error) {
    console.error("Error querying studies:", JSON.stringify(error, null, 2));
  } else {
    console.log("Successfully queried studies. Columns available:", Object.keys(data[0] || {}));
  }
}

checkStudies();
