begin;
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in ('owner_bootstrap', 'role_change', 'clinician_invite', 'settings_change'));
commit;
