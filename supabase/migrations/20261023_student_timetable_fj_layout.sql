-- Store second-grade F-J subject names by code, shared only by matching student identities.
-- Existing per-slot data remains untouched; this migration copies it into the code-based table.

begin;

create table if not exists public.student_elective_subjects (
  school_name text not null,
  grade text not null check (grade = '2학년'),
  student_id text not null check (length(btrim(student_id)) between 1 and 20),
  code text not null check (code in ('F','G','H','I','J')),
  subject text check (subject is null or length(btrim(subject)) between 1 and 24),
  updated_at timestamptz not null default now(),
  primary key (school_name, grade, student_id, code)
);

-- Also support projects where an earlier setup draft created the same table as NOT NULL.
alter table public.student_elective_subjects alter column subject drop not null;
alter table public.student_elective_subjects drop constraint if exists student_elective_subjects_subject_check;
alter table public.student_elective_subjects
  add constraint student_elective_subjects_subject_check
  check (subject is null or length(btrim(subject)) between 1 and 24);

create or replace function public.sifs_student_timetable_matches(
  p_school_name text,
  p_grade text,
  p_student_id text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_school_name
      and p.profile->>'grade' = p_grade
      and nullif(btrim(p.profile->>'studentId'), '') = p_student_id
  );
$$;

revoke all on function public.sifs_student_timetable_matches(text,text,text) from public;
grant execute on function public.sifs_student_timetable_matches(text,text,text) to authenticated;

create or replace function public.sifs_can_read_post(
  p_audience_type text,
  p_target_school text,
  p_target_grade text,
  p_target_class text,
  p_target_subject text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if p_target_school is null or btrim(p_target_school) = '' then
    return false;
  end if;
  if auth.uid() is null then
    return p_audience_type = 'school' and p_target_school = '서현고등학교';
  end if;
  if p_audience_type = 'school' then
    return exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
    );
  end if;
  if p_audience_type = 'class' then
    return exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
        and p.profile->>'grade' = p_target_grade
        and p.profile->>'className' = p_target_class
    );
  end if;
  if p_audience_type = 'subject' then
    return p_target_subject is not null and (
      exists (
        select 1
        from public.timetables t
        join public.profiles p on p.user_id = t.user_id
        cross join lateral jsonb_array_elements(coalesce(t.items, '[]'::jsonb)) as slots(item)
        where t.user_id = auth.uid()
          and coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
          and slots.item->>'subject' = p_target_subject
      )
      or exists (
        select 1
        from public.student_timetable_slots s
        join public.profiles p on p.user_id = auth.uid()
        where coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
          and p.profile->>'grade' = s.grade
          and nullif(btrim(p.profile->>'studentId'), '') = s.student_id
          and s.school_name = p_target_school
          and s.subject = p_target_subject
      )
      or exists (
        select 1
        from public.student_elective_subjects s
        join public.profiles p on p.user_id = auth.uid()
        where coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
          and p.profile->>'grade' = s.grade
          and nullif(btrim(p.profile->>'studentId'), '') = s.student_id
          and s.school_name = p_target_school
          and s.subject = p_target_subject
      )
    );
  end if;
  return false;
end;
$$;

grant execute on function public.sifs_can_read_post(text,text,text,text,text) to anon, authenticated;

alter table public.student_elective_subjects enable row level security;
grant select, insert, update, delete on public.student_elective_subjects to authenticated;

drop policy if exists "Matching students can read F-J elective subjects" on public.student_elective_subjects;
create policy "Matching students can read F-J elective subjects"
  on public.student_elective_subjects for select to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can create F-J elective subjects" on public.student_elective_subjects;
create policy "Matching students can create F-J elective subjects"
  on public.student_elective_subjects for insert to authenticated
  with check (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can update F-J elective subjects" on public.student_elective_subjects;
create policy "Matching students can update F-J elective subjects"
  on public.student_elective_subjects for update to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id))
  with check (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can delete F-J elective subjects" on public.student_elective_subjects;
create policy "Matching students can delete F-J elective subjects"
  on public.student_elective_subjects for delete to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id));

-- Existing code mappings are authoritative after the first migration. Before that, choose the
-- latest value from old shared slots or per-account JSON. No legacy source is deleted or rewritten.
with candidates as (
  select school_name, grade, student_id, code, subject, updated_at,
         3 as source_priority, null::text as account_id
  from public.student_elective_subjects

  union all

  select school_name, grade, student_id, code, subject, updated_at,
         2 as source_priority, null::text as account_id
  from public.student_timetable_slots
  where grade = '2학년' and code in ('F','G','H','I','J')

  union all

  select
    coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') as school_name,
    p.profile->>'grade' as grade,
    btrim(p.profile->>'studentId') as student_id,
    upper(btrim(item->>'code')) as code,
    nullif(btrim(item->>'subject'), '') as subject,
    t.updated_at,
    1 as source_priority,
    p.user_id::text as account_id
  from public.profiles p
  join public.timetables t on t.user_id = p.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(t.items) = 'array' then t.items else '[]'::jsonb end
  ) as legacy(item)
), ranked as (
  select candidates.*,
    row_number() over (
      partition by school_name, grade, student_id, code
      order by source_priority desc, updated_at desc, account_id desc nulls last, subject desc
    ) as code_rank
  from candidates
  where grade = '2학년'
    and length(btrim(student_id)) between 1 and 20
    and (subject is null or length(btrim(subject)) between 1 and 24)
    and (source_priority = 3 or subject is not null)
    and code in ('F','G','H','I','J')
), selected as (
  select school_name, grade, student_id, code, subject, updated_at
  from ranked
  where code_rank = 1
)
insert into public.student_elective_subjects
  (school_name, grade, student_id, code, subject, updated_at)
select school_name, grade, student_id, code, subject, updated_at
from selected
on conflict (school_name, grade, student_id, code) do update
set subject = excluded.subject,
    updated_at = excluded.updated_at;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'student_elective_subjects'
     ) then
    execute 'alter publication supabase_realtime add table public.student_elective_subjects';
  end if;
end;
$$;

commit;
