begin;

drop policy if exists profiles_read_assigned_patient on public.profiles;
create policy profiles_read_assigned_patient
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.user_id = profiles.id
      and p.assigned_doctor_id = (select auth.uid())
  )
);

commit;
