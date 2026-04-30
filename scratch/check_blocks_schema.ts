
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function checkBlocks() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data, error } = await admin.from('study_blocks').select('*').limit(1);
  if (error) {
    console.error("Error querying study_blocks:", JSON.stringify(error, null, 2));
  } else {
    console.log("Successfully queried study_blocks. Columns available:", Object.keys(data[0] || {}));
  }
}

checkBlocks();
