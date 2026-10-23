-- SIFS initial Supabase schema
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.posts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.timetables (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Audience and moderation metadata are separate from the display JSON so RLS can enforce them.
alter table public.posts add column if not exists audience_type text not null default 'school';
alter table public.posts add column if not exists target_school text not null default '서현고등학교';
alter table public.posts add column if not exists target_grade text;
alter table public.posts add column if not exists target_class text;
alter table public.posts add column if not exists target_subject text;
alter table public.posts add column if not exists moderation_status text not null default 'published';

-- Backfill older beta rows from the existing audience label.
update public.posts
set target_school = coalesce(
      nullif(btrim(target_school), ''),
      case
        when coalesce(post->>'audience', '') ~ '^.+[[:space:]]+전체$'
          then regexp_replace(btrim(post->>'audience'), '[[:space:]]+전체$', '')
        else '서현고등학교'
      end
    ),
    audience_type = case
      when post->>'audience' = '내가 선택한 과목' then 'subject'
      when coalesce(post->>'audience', '') ~ '^[1-3]학년[[:space:]]+[0-9]+반$' then 'class'
      else 'school'
    end,
    target_grade = case
      when coalesce(post->>'audience', '') ~ '^[1-3]학년[[:space:]]+[0-9]+반$'
        then substring(post->>'audience' from '^([1-3]학년)')
      else null
    end,
    target_class = case
      when coalesce(post->>'audience', '') ~ '^[1-3]학년[[:space:]]+[0-9]+반$'
        then substring(post->>'audience' from '([0-9]+반)$')
      else null
    end,
    target_subject = case
      when post->>'audience' = '내가 선택한 과목' then nullif(btrim(post->>'subject'), '')
      else null
    end;
alter table public.posts alter column target_school set default '서현고등학교';
alter table public.posts alter column target_school set not null;

create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('잘못된 정보','스팸/광고','개인정보 노출','부적절한 내용','기타')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  unique (post_id, reporter_id)
);

alter table public.moderators enable row level security;
alter table public.reports enable row level security;

create or replace function public.is_sifs_moderator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.moderators
    where user_id = auth.uid()
  );
$$;

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
    return p_target_subject is not null and exists (
      select 1
      from public.timetables t
      join public.profiles p on p.user_id = t.user_id
      cross join lateral jsonb_array_elements(coalesce(t.items, '[]'::jsonb)) as slots(item)
      where t.user_id = auth.uid()
        and coalesce(nullif(btrim(p.profile->>'schoolName'), ''), '서현고등학교') = p_target_school
        and slots.item->>'subject' = p_target_subject
    );
  end if;
  return false;
end;
$$;

create or replace function public.sifs_protect_post_moderation_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if public.is_sifs_moderator() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.moderation_status := 'published';
  else
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;

drop trigger if exists sifs_protect_post_moderation_status on public.posts;
create trigger sifs_protect_post_moderation_status
before insert or update of moderation_status on public.posts
for each row execute function public.sifs_protect_post_moderation_status();

create or replace function public.sifs_set_post_moderation_status(p_post_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not public.is_sifs_moderator() then
    raise exception 'Moderator access required';
  end if;
  if p_status not in ('published','hidden') then
    raise exception 'Unsupported moderation status';
  end if;
  update public.posts set moderation_status = p_status where id = p_post_id;
  if not found then
    raise exception 'Post not found';
  end if;
end;
$$;

revoke all on function public.is_sifs_moderator() from public;
revoke all on function public.sifs_set_post_moderation_status(text,text) from public;
grant execute on function public.is_sifs_moderator() to anon, authenticated;
revoke all on function public.sifs_can_read_post(text,text,text,text,text) from public;
grant execute on function public.sifs_can_read_post(text,text,text,text,text) to anon, authenticated;
grant execute on function public.sifs_set_post_moderation_status(text,text) to authenticated;

alter table public.posts enable row level security;
alter table public.profiles enable row level security;
alter table public.timetables enable row level security;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.timetables to authenticated;

drop policy if exists "Anyone can read posts" on public.posts;
drop policy if exists "Readers can access posts in their audience" on public.posts;
create policy "Readers can access posts in their audience"
  on public.posts for select to anon, authenticated
  using (
    (moderation_status = 'published'
      and public.sifs_can_read_post(audience_type, target_school, target_grade, target_class, target_subject))
    or public.is_sifs_moderator()
  );

-- Audience-specific post images stay private; image reads are authorized by the Storage policy below.
drop policy if exists "Signed-in users can create posts as themselves" on public.posts;
create policy "Signed-in users can create posts as themselves"
  on public.posts for insert to authenticated
  with check (
    auth.uid() = user_id
    and moderation_status = 'published'
    and (public.sifs_can_read_post(audience_type, target_school, target_grade, target_class, target_subject)
      or public.is_sifs_moderator())
  );

drop policy if exists "Authors can update their posts" on public.posts;
create policy "Authors can update their posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (public.sifs_can_read_post(audience_type, target_school, target_grade, target_class, target_subject)
      or public.is_sifs_moderator())
  );

drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their moderator role or moderators can read roles" on public.moderators;
create policy "Users can read their moderator role or moderators can read roles"
  on public.moderators for select to authenticated
  using (user_id = auth.uid() or public.is_sifs_moderator());

drop policy if exists "Reporters and moderators can read reports" on public.reports;
drop policy if exists "Only moderators can read reports" on public.reports;
create policy "Only moderators can read reports"
  on public.reports for select to authenticated
  using (public.is_sifs_moderator());

drop policy if exists "Signed-in users can submit reports" on public.reports;
create policy "Signed-in users can submit reports"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.moderation_status = 'published'
        and public.sifs_can_read_post(p.audience_type, p.target_school, p.target_grade, p.target_class, p.target_subject)
    )
  );

drop function if exists public.sifs_can_read_post(text,text,text,text);

drop policy if exists "Moderators can update report status" on public.reports;
create policy "Moderators can update report status"
  on public.reports for update to authenticated
  using (public.is_sifs_moderator())
  with check (public.is_sifs_moderator());

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert on public.reports to authenticated;
grant update on public.reports to authenticated;
grant select on public.moderators to authenticated;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their profile" on public.profiles;
create policy "Users can delete their profile"
  on public.profiles for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their timetable" on public.timetables;
create policy "Users can read their timetable"
  on public.timetables for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their timetable" on public.timetables;
create policy "Users can create their timetable"
  on public.timetables for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their timetable" on public.timetables;
create policy "Users can update their timetable"
  on public.timetables for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their timetable" on public.timetables;
create policy "Users can delete their timetable"
  on public.timetables for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Anyone can read post images" on storage.objects;
drop policy if exists "Users can read images in visible posts" on storage.objects;
create policy "Users can read images in visible posts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-images'
    and exists (
      select 1
      from public.posts p
      where p.id = (storage.foldername(name))[2]
        and p.user_id::text = (storage.foldername(name))[1]
        and (
          (p.moderation_status = 'published'
            and public.sifs_can_read_post(p.audience_type, p.target_school, p.target_grade, p.target_class, p.target_subject))
          or public.is_sifs_moderator()
        )
    )
  );

drop policy if exists "Users can upload their own post images" on storage.objects;
create policy "Users can upload their own post images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own post images" on storage.objects;
create policy "Users can update their own post images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own post images" on storage.objects;
create policy "Users can delete their own post images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'posts'
     ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end
$$;

-- Assign the sole moderation role to the requested Supabase Auth account.
-- Keep this account registered in Authentication before running this setup file.
do $$
declare
  target_admin_id uuid;
begin
  select id into target_admin_id
  from auth.users
  where lower(email) = lower('hongsg821@gmail.com')
  order by created_at asc
  limit 1;

  if target_admin_id is null then
    raise exception 'Supabase Auth account hongsg821@gmail.com was not found. Sign in with that account, then run this setup again.';
  end if;

  delete from public.moderators where user_id <> target_admin_id;
  insert into public.moderators (user_id)
  values (target_admin_id)
  on conflict (user_id) do nothing;
end
$$;

-- Make newly added public columns and policies visible to the Supabase REST API immediately.
notify pgrst, 'reload schema';
