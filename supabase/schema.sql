-- ThanConnect Ebook Library production database schema
-- Run this file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  role text not null default 'reader' check (role in ('admin', 'librarian', 'reader')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  description text not null default '',
  category text not null default 'General',
  language text not null default 'th',
  pages integer not null default 1 check (pages > 0),
  cover_url text,
  flipbook_url text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'reading' check (status in ('reading', 'completed', 'returned', 'archived')),
  borrowed_at timestamptz not null default now(),
  returned_at timestamptz,
  unique(user_id, book_id)
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  current_page integer not null default 1 check (current_page > 0),
  total_pages integer not null default 1 check (total_pages > 0),
  percent numeric(5,2) not null default 0 check (percent >= 0 and percent <= 100),
  last_read_at timestamptz not null default now(),
  unique(user_id, book_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  page integer not null default 1 check (page > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reader_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  book_id uuid references public.books(id) on delete cascade,
  event_type text not null,
  page integer,
  percent numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    'reader'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$ language sql stable security definer;

create or replace function public.is_librarian_or_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'librarian') and status = 'active'
  );
$$ language sql stable security definer;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_library enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reader_events enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users" on public.profiles
for select to authenticated using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Active books are readable" on public.books;
create policy "Active books are readable" on public.books
for select to authenticated using (is_active = true or public.is_librarian_or_admin());

drop policy if exists "Librarians can manage books" on public.books;
create policy "Librarians can manage books" on public.books
for all to authenticated using (public.is_librarian_or_admin()) with check (public.is_librarian_or_admin());

drop policy if exists "Users manage own library" on public.user_library;
create policy "Users manage own library" on public.user_library
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins view all library rows" on public.user_library;
create policy "Admins view all library rows" on public.user_library
for select to authenticated using (public.is_librarian_or_admin());

drop policy if exists "Users manage own progress" on public.reading_progress;
create policy "Users manage own progress" on public.reading_progress
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins view all progress" on public.reading_progress;
create policy "Admins view all progress" on public.reading_progress
for select to authenticated using (public.is_librarian_or_admin());

drop policy if exists "Users manage own bookmarks" on public.bookmarks;
create policy "Users manage own bookmarks" on public.bookmarks
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users insert own events" on public.reader_events;
create policy "Users insert own events" on public.reader_events
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users read own events" on public.reader_events;
create policy "Users read own events" on public.reader_events
for select to authenticated using (user_id = auth.uid() or public.is_librarian_or_admin());

create index if not exists idx_books_category on public.books(category);
create index if not exists idx_user_library_user on public.user_library(user_id);
create index if not exists idx_progress_user_book on public.reading_progress(user_id, book_id);
create index if not exists idx_bookmarks_user_book on public.bookmarks(user_id, book_id);
create index if not exists idx_events_book_time on public.reader_events(book_id, created_at desc);
