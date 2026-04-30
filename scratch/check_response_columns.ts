
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function checkResponseColumns() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data, error } = await admin.from('responses').select('*').limit(1);
  if (error) {
    console.error("Error querying responses:", JSON.stringify(error, null, 2));
  } else {
    console.log("Response columns available:", Object.keys(data[0] || {}));
  }
}

checkResponseColumns();
