begin;

create or replace function public.is_rehabai_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$function$;

revoke all on function public.is_rehabai_admin() from public, anon;
grant execute on function public.is_rehabai_admin() to authenticated, service_role;

do $migration$
declare
  policy_record record;
  admin_claim_expression constant text := $claim$(((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)$claim$;
  rewritten_using text;
  rewritten_check text;
  alter_statement text;
begin
  for policy_record in
    select
      policy.polname,
      relation.relname,
      pg_get_expr(policy.polqual, policy.polrelid) as using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) as check_expression
    from pg_policy as policy
    join pg_class as relation on relation.oid = policy.polrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and (
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') like '%app_metadata%'
        or coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '') like '%app_metadata%'
      )
  loop
    rewritten_using := replace(policy_record.using_expression, admin_claim_expression, 'public.is_rehabai_admin()');
    rewritten_check := replace(policy_record.check_expression, admin_claim_expression, 'public.is_rehabai_admin()');

    if rewritten_using is distinct from policy_record.using_expression
      or rewritten_check is distinct from policy_record.check_expression then
      alter_statement := format('alter policy %I on public.%I', policy_record.polname, policy_record.relname);
      if rewritten_using is distinct from policy_record.using_expression then
        alter_statement := alter_statement || format(' using (%s)', rewritten_using);
      end if;
      if rewritten_check is distinct from policy_record.check_expression then
        alter_statement := alter_statement || format(' with check (%s)', rewritten_check);
      end if;
      execute alter_statement;
    end if;
  end loop;
end;
$migration$;

commit;
