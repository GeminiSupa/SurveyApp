require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: responses } = await supabase.from('responses').select('question_key, study_id').limit(10);
  console.log("RESPONSES:");
  console.log(responses);

  if (responses && responses.length > 0) {
    const studyId = responses[0].study_id;
    const { data: blocks } = await supabase.from('study_blocks').select('id, config, label').eq('study_id', studyId);
    console.log("BLOCKS:");
    console.log(blocks.map(b => ({id: b.id, q: b.config?.question, l: b.label})));
  }
}
run();
