-- Share elective timetable slots across accounts with the same school, grade, and student ID.
-- Safe to run more than once. Legacy per-account rows are retained in public.timetables.

begin;

create table if not exists public.student_timetable_slots (
  school_name text not null,
  grade text not null check (grade in ('1학년','2학년','3학년')),
  student_id text not null check (length(btrim(student_id)) between 1 and 20),
  day smallint not null check (day between 1 and 5),
  period smallint not null check (period between 1 and 7),
  subject text not null check (length(btrim(subject)) between 1 and 24),
  code text not null check (code ~ '^[A-J]$'),
  updated_at timestamptz not null default now(),
  primary key (school_name, grade, student_id, day, period)
);

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

-- Keep subject-audience posts visible after elective slots leave the per-account JSON table.
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
    );
  end if;
  return false;
end;
$$;

grant execute on function public.sifs_can_read_post(text,text,text,text,text) to anon, authenticated;

alter table public.student_timetable_slots enable row level security;
grant select, insert, update, delete on public.student_timetable_slots to authenticated;

drop policy if exists "Matching students can read shared electives" on public.student_timetable_slots;
create policy "Matching students can read shared electives"
  on public.student_timetable_slots for select to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can create shared electives" on public.student_timetable_slots;
create policy "Matching students can create shared electives"
  on public.student_timetable_slots for insert to authenticated
  with check (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can update shared electives" on public.student_timetable_slots;
create policy "Matching students can update shared electives"
  on public.student_timetable_slots for update to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id))
  with check (public.sifs_student_timetable_matches(school_name, grade, student_id));

drop policy if exists "Matching students can delete shared electives" on public.student_timetable_slots;
create policy "Matching students can delete shared electives"
  on public.student_timetable_slots for delete to authenticated
  using (public.sifs_student_timetable_matches(school_name, grade, student_id));

-- Copy existing selected courses into the shared table. If duplicate accounts have conflicting
-- entries for one period, keep the most recently updated account's value. Do not delete legacy rows.
with parsed as (
  select
    coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') as school_name,
    p.profile->>'grade' as grade,
    btrim(p.profile->>'studentId') as student_id,
    case when coalesce(item->>'day', '') ~ '^[1-5]$' then (item->>'day')::smallint end as day,
    case when coalesce(item->>'period', '') ~ '^[1-7]$' then (item->>'period')::smallint end as period,
    nullif(btrim(item->>'subject'), '') as subject,
    upper(btrim(item->>'code')) as code,
    t.updated_at,
    p.user_id
  from public.profiles p
  join public.timetables t on t.user_id = p.user_id
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(t.items) = 'array' then t.items else '[]'::jsonb end
  ) as legacy(item)
), ranked as (
  select parsed.*,
    row_number() over (
      partition by school_name, grade, student_id, day, period
      order by updated_at desc, user_id::text
    ) as slot_rank
  from parsed
  where grade in ('1학년','2학년','3학년')
    and length(student_id) between 1 and 20
    and day is not null
    and period is not null
    and subject is not null
    and length(subject) <= 24
    and code ~ '^[A-J]$'
)
insert into public.student_timetable_slots
  (school_name, grade, student_id, day, period, subject, code)
select school_name, grade, student_id, day, period, subject, code
from ranked
where slot_rank = 1
on conflict (school_name, grade, student_id, day, period) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'student_timetable_slots'
     ) then
    execute 'alter publication supabase_realtime add table public.student_timetable_slots';
  end if;
end;
$$;

commit;
