do $$
declare
  demo_org_id uuid;
  demo_project_id uuid;
  demo_study_id uuid;
  demo_audience_id uuid;
begin
  insert into organizations (name, slug)
  values ('Demo Research Lab', 'demo-research-lab')
  returning id into demo_org_id;

  insert into projects (organization_id, name, study_type)
  values (demo_org_id, 'Demo UX Project', 'ux_research')
  returning id into demo_project_id;

  insert into studies (project_id, public_id, title, status)
  values (demo_project_id, 'demo', 'Mobile UX Onboarding Study', 'published')
  returning id into demo_study_id;

  insert into audiences (project_id, name, description)
  values (demo_project_id, 'Intro to Psych 101', 'Baseline semester participant pool')
  returning id into demo_audience_id;

  insert into magic_links (study_id, audience_id, expires_at, max_uses)
  values (demo_study_id, demo_audience_id, now() + interval '60 days', 300);

  insert into study_blocks (study_id, block_type, label, sort_order, config)
  values
    (demo_study_id, 'consent', 'Consent', 1, '{"required": true}'::jsonb),
    (demo_study_id, 'survey', 'Ease Rating', 2, '{"questionKey": "ease_of_first_interaction", "scale": [1,2,3,4,5]}'::jsonb),
    (demo_study_id, 'ux_task', 'First Click Test', 3, '{"taskType":"first_click","prompt":"Tap where you would start checkout.","imageUrl":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200"}'::jsonb),
    (demo_study_id, 'reaction_time', 'Reaction Speed', 4, '{"instruction":"Tap immediately when the color turns green."}'::jsonb),
    (demo_study_id, 'iat', 'IAT Mini Block', 5, '{"leftLabel":"Design","rightLabel":"Non-Design","stimuli":["Wireframe","Analytics","Prototype","Survey"]}'::jsonb),
    (demo_study_id, 'thank_you', 'Thank You', 6, '{}'::jsonb);
exception
  when unique_violation then
    raise notice 'Seed already exists (likely public_id=demo). Skipping inserts.';
end $$;
