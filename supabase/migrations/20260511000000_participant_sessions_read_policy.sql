-- Add RLS policy for organization members to read participant sessions
drop policy if exists participant_sessions_org_read on participant_sessions;
create policy participant_sessions_org_read on participant_sessions for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = participant_sessions.study_id and exists (
      select 1
      from organization_memberships om
      where om.organization_id = p.organization_id
        and om.user_id = auth.uid()
    )
  )
);
