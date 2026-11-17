begin;
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
create policy platform_settings_admin_read on public.platform_settings
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in ('owner_bootstrap', 'role_change', 'clinician_invite', 'settings_change'));
insert into public.platform_settings (key, value)
values ('patient_registration_enabled', 'true'::jsonb)
on conflict (key) do nothing;
commit;
