
import { createAdminSupabaseClient } from '../src/lib/supabase/admin';

async function testInsertStudy() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    console.error("Admin client failed to initialize");
    process.exit(1);
  }

  const { data: project } = await admin.from('projects').select('id').limit(1).single();
  if (!project) {
    console.error("No project found to test with");
    process.exit(1);
  }

  const { error } = await admin.from('studies').insert({
    project_id: project.id,
    title: "Test Schema",
    public_id: "test-schema-" + Date.now(),
    config: { test: true }
  });

  if (error) {
    console.error("Insert failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("Insert succeeded. Config column exists.");
  }
}

testInsertStudy();
