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

alter table public.posts enable row level security;
alter table public.profiles enable row level security;
alter table public.timetables enable row level security;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.timetables to authenticated;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts for select to anon, authenticated
  using (true);

drop policy if exists "Signed-in users can create posts as themselves" on public.posts;
create policy "Signed-in users can create posts as themselves"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authors can update their posts" on public.posts;
create policy "Authors can update their posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authors can delete their posts" on public.posts;
create policy "Authors can delete their posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

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
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read post images" on storage.objects;
create policy "Anyone can read post images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-images');

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