begin;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  previous_role text,
  new_role text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check check (action in ('owner_bootstrap', 'role_change', 'clinician_invite')),
  constraint audit_logs_previous_role_check check (previous_role is null or previous_role in ('patient', 'doctor', 'admin')),
  constraint audit_logs_new_role_check check (new_role is null or new_role in ('patient', 'doctor', 'admin'))
);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
grant all on public.audit_logs to service_role;

create or replace function public.bootstrap_rehabai_owner(p_user_id uuid, p_owner_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_confirmed_at timestamptz;
  v_existing_role text;
begin
  perform pg_advisory_xact_lock(hashtext('rehabai-first-owner-bootstrap'));
  if p_user_id is null or nullif(trim(p_owner_email), '') is null then
    raise exception 'Owner bootstrap is not configured';
  end if;
  if exists (select 1 from public.profiles where role = 'admin')
     or exists (select 1 from auth.users where raw_app_meta_data ->> 'role' = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  select email, email_confirmed_at into v_email, v_confirmed_at
    from auth.users where id = p_user_id for update;
  if v_email is null or lower(v_email) <> lower(trim(p_owner_email)) then
    raise exception 'Authenticated account is not the configured owner';
  end if;
  if v_confirmed_at is null then
    raise exception 'Owner email must be verified before bootstrap';
  end if;
  select role into v_existing_role from public.profiles where id = p_user_id for update;
  if not found or v_existing_role <> 'patient' then
    raise exception 'A patient profile is required for initial owner bootstrap';
  end if;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin'), updated_at = now()
    where id = p_user_id;
  update public.profiles set role = 'admin', updated_at = now() where id = p_user_id;
  insert into public.audit_logs (actor_id, target_user_id, action, previous_role, new_role, details)
    values (p_user_id, p_user_id, 'owner_bootstrap', 'patient', 'admin', jsonb_build_object('source', 'first_owner_bootstrap'));
end;
$function$;
revoke all on function public.bootstrap_rehabai_owner(uuid, text) from public, anon, authenticated;
grant execute on function public.bootstrap_rehabai_owner(uuid, text) to service_role;
commit;
