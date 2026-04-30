
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function testCreate() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const name = "Test Organization";
  const slug = "test-org-" + Date.now();

  const { data, error } = await admin
    .from('organizations')
    .insert({ name, slug })
    .select('id, name')
    .single();

  if (error) {
    console.error("Org creation failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("Successfully created organization:", data);
    // Cleanup
    await admin.from('organizations').delete().eq('id', data.id);
    console.log("Deleted test organization.");
  }
}

testCreate();
