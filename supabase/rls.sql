alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table projects enable row level security;
alter table studies enable row level security;
alter table study_versions enable row level security;
alter table study_blocks enable row level security;
alter table logic_rules enable row level security;
alter table randomization_rules enable row level security;
alter table disqualification_rules enable row level security;
alter table audiences enable row level security;
alter table audience_members enable row level security;
alter table magic_links enable row level security;
alter table participant_sessions enable row level security;
alter table responses enable row level security;
alter table consents enable row level security;
alter table psych_trials enable row level security;
alter table events enable row level security;
alter table friction_alerts enable row level security;
alter table request_replay_guards enable row level security;
alter table security_audit_logs enable row level security;
alter table study_threshold_audit_logs enable row level security;

create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1
    from organization_memberships om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function can_manage_org(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1
    from organization_memberships om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'editor')
  );
$$;

drop policy if exists organizations_read on organizations;
create policy organizations_read on organizations for select using (is_org_member(id));
drop policy if exists organizations_write on organizations;
create policy organizations_write on organizations for update using (can_manage_org(id));

drop policy if exists memberships_read on organization_memberships;
create policy memberships_read on organization_memberships for select using (is_org_member(organization_id));
drop policy if exists memberships_write on organization_memberships;
create policy memberships_write on organization_memberships for all using (can_manage_org(organization_id));

drop policy if exists projects_read on projects;
create policy projects_read on projects for select using (is_org_member(organization_id));
drop policy if exists projects_write on projects;
create policy projects_write on projects for all using (can_manage_org(organization_id));

drop policy if exists studies_read on studies;
create policy studies_read on studies for select using (
  exists (
    select 1 from projects p
    where p.id = studies.project_id and is_org_member(p.organization_id)
  ) or status = 'published'
);
drop policy if exists studies_write on studies;
create policy studies_write on studies for all using (
  exists (
    select 1 from projects p
    where p.id = studies.project_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists study_blocks_org_read on study_blocks;
create policy study_blocks_org_read on study_blocks for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_blocks.study_id and is_org_member(p.organization_id)
  ) or exists (
    select 1 from studies s
    where s.id = study_blocks.study_id and s.status = 'published'
  )
);
drop policy if exists study_blocks_org_write on study_blocks;
create policy study_blocks_org_write on study_blocks for all using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_blocks.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists logic_rules_org_read on logic_rules;
create policy logic_rules_org_read on logic_rules for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = logic_rules.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists logic_rules_org_write on logic_rules;
create policy logic_rules_org_write on logic_rules for all using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = logic_rules.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists randomization_rules_org_read on randomization_rules;
create policy randomization_rules_org_read on randomization_rules for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = randomization_rules.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists randomization_rules_org_write on randomization_rules;
create policy randomization_rules_org_write on randomization_rules for all using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = randomization_rules.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists disqualification_rules_org_read on disqualification_rules;
create policy disqualification_rules_org_read on disqualification_rules for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = disqualification_rules.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists disqualification_rules_org_write on disqualification_rules;
create policy disqualification_rules_org_write on disqualification_rules for all using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = disqualification_rules.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists audiences_org_read on audiences;
create policy audiences_org_read on audiences for select using (
  exists (
    select 1
    from projects p
    where p.id = audiences.project_id and is_org_member(p.organization_id)
  )
);
drop policy if exists audiences_org_write on audiences;
create policy audiences_org_write on audiences for all using (
  exists (
    select 1
    from projects p
    where p.id = audiences.project_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists audience_members_org_read on audience_members;
create policy audience_members_org_read on audience_members for select using (
  exists (
    select 1
    from audiences a
    join projects p on p.id = a.project_id
    where a.id = audience_members.audience_id and is_org_member(p.organization_id)
  )
);
drop policy if exists audience_members_org_write on audience_members;
create policy audience_members_org_write on audience_members for all using (
  exists (
    select 1
    from audiences a
    join projects p on p.id = a.project_id
    where a.id = audience_members.audience_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists study_versions_org_read on study_versions;
create policy study_versions_org_read on study_versions for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_versions.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists study_versions_org_write on study_versions;
create policy study_versions_org_write on study_versions for all using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_versions.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists request_replay_deny_all on request_replay_guards;
create policy request_replay_deny_all on request_replay_guards for all using (false);

drop policy if exists audit_logs_org_read on security_audit_logs;
create policy audit_logs_org_read on security_audit_logs for select using (
  actor_user_id = auth.uid()
);

drop policy if exists threshold_audit_org_read on study_threshold_audit_logs;
create policy threshold_audit_org_read on study_threshold_audit_logs for select using (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_threshold_audit_logs.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists threshold_audit_org_write on study_threshold_audit_logs;
create policy threshold_audit_org_write on study_threshold_audit_logs for insert with check (
  exists (
    select 1
    from studies s
    join projects p on p.id = s.project_id
    where s.id = study_threshold_audit_logs.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists participant_insert on participant_sessions;
create policy participant_insert on participant_sessions for insert with check (
  exists (
    select 1
    from studies s
    where s.id = participant_sessions.study_id
      and s.status = 'published'
  )
);
drop policy if exists participant_read_self on participant_sessions;
create policy participant_read_self on participant_sessions for select using (false);
drop policy if exists participant_update_none on participant_sessions;
create policy participant_update_none on participant_sessions for update using (false);

drop policy if exists responses_insert on responses;
create policy responses_insert on responses for insert with check (
  exists (
    select 1
    from participant_sessions ps
    join studies s on s.id = ps.study_id
    where ps.id = responses.participant_session_id
      and ps.study_id = responses.study_id
      and ps.status in ('in_progress', 'completed')
      and s.status = 'published'
  )
);
drop policy if exists responses_org_read on responses;
create policy responses_org_read on responses for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = responses.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists responses_update_none on responses;
create policy responses_update_none on responses for update using (false);
drop policy if exists responses_delete_none on responses;
create policy responses_delete_none on responses for delete using (false);

drop policy if exists consents_insert on consents;
create policy consents_insert on consents for insert with check (
  exists (
    select 1
    from participant_sessions ps
    join studies s on s.id = ps.study_id
    where ps.id = consents.participant_session_id
      and ps.study_id = consents.study_id
      and s.status = 'published'
  )
);
drop policy if exists consents_org_read on consents;
create policy consents_org_read on consents for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = consents.study_id and is_org_member(p.organization_id)
  )
);

drop policy if exists events_insert on events;
create policy events_insert on events for insert with check (
  exists (
    select 1
    from participant_sessions ps
    join studies s on s.id = ps.study_id
    where ps.id = events.participant_session_id
      and ps.study_id = events.study_id
      and ps.status in ('in_progress', 'completed')
      and s.status = 'published'
  )
);
drop policy if exists events_org_read on events;
create policy events_org_read on events for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = events.study_id and is_org_member(p.organization_id)
  )
);

drop policy if exists psych_trials_insert on psych_trials;
create policy psych_trials_insert on psych_trials for insert with check (
  exists (
    select 1
    from participant_sessions ps
    join studies s on s.id = ps.study_id
    where ps.id = psych_trials.participant_session_id
      and ps.study_id = psych_trials.study_id
      and ps.status in ('in_progress', 'completed')
      and s.status = 'published'
  )
);
drop policy if exists psych_trials_org_read on psych_trials;
create policy psych_trials_org_read on psych_trials for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = psych_trials.study_id and is_org_member(p.organization_id)
  )
);

drop policy if exists friction_alerts_org_read on friction_alerts;
create policy friction_alerts_org_read on friction_alerts for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = friction_alerts.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists friction_alerts_org_write on friction_alerts;
create policy friction_alerts_org_write on friction_alerts for all using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = friction_alerts.study_id and can_manage_org(p.organization_id)
  )
);

drop policy if exists magic_links_org_read on magic_links;
create policy magic_links_org_read on magic_links for select using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = magic_links.study_id and is_org_member(p.organization_id)
  )
);
drop policy if exists magic_links_org_write on magic_links;
create policy magic_links_org_write on magic_links for all using (
  exists (
    select 1 from studies s
    join projects p on p.id = s.project_id
    where s.id = magic_links.study_id and can_manage_org(p.organization_id)
  )
);
