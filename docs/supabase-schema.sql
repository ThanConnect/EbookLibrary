-- TPS Ebook Library Supabase schema
-- Run this file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'teacher', 'librarian', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  category text default 'General',
  language text default 'th',
  pages integer default 1 check (pages > 0),
  cover_url text,
  flipbook_url text,
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
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  page integer not null default 1 check (page > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reader_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  event_type text not null,
  page integer,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_library enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reader_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "books_select_active" on public.books for select using (is_active = true);
create policy "books_admin_all" on public.books for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'librarian'))
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'librarian'))
);

create policy "library_select_own" on public.user_library for select using (auth.uid() = user_id);
create policy "library_insert_own" on public.user_library for insert with check (auth.uid() = user_id);
create policy "library_update_own" on public.user_library for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bookmarks_select_own" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_update_own" on public.bookmarks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on public.bookmarks for delete using (auth.uid() = user_id);

create policy "events_insert_own" on public.reader_events for insert with check (auth.uid() = user_id);
create policy "events_admin_select" on public.reader_events for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'librarian'))
);

insert into public.books (title, author, description, category, pages, cover_url, flipbook_url, is_active)
values
('AI for Education', 'TPS Learning Team', 'แนวคิดและตัวอย่างการใช้ AI เพื่อออกแบบการเรียนรู้ยุคใหม่', 'Technology', 120, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80', './production-status.html', true),
('Digital Library Playbook', 'Tharnpanya School Library', 'คู่มือออกแบบคลังหนังสือดิจิทัลและประสบการณ์ผู้อ่าน', 'Library', 96, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80', './production-status.html', true),
('Learning Design Toolkit', 'TPS Academic Team', 'เครื่องมือสำหรับออกแบบบทเรียน กิจกรรม และการประเมินผล', 'Education', 144, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80', './production-status.html', true);
