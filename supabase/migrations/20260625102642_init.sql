-- Pismotéka — initial schema (M1)
-- Community blogging platform. Supabase Postgres. Public read-heavy, RLS-enforced writes.
-- Entities mirror Architecture.md ERD. Phase-2 tables (reports, editorial_picks) created now
-- so the reading side never needs migration later.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role     as enum ('reader', 'author', 'admin');
create type public.article_status as enum ('draft', 'scheduled', 'published');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Time-decay "hot" score (Hacker-News style). STABLE: depends on now().
create or replace function public.compute_hot_score(karma int, published timestamptz)
returns numeric language sql stable as $$
  select case
    when published is null then 0
    else karma::numeric / power(extract(epoch from (now() - published)) / 3600 + 2, 1.5)
  end;
$$;

-- ---------------------------------------------------------------------------
-- profile  (extends auth.users 1:1)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name   text not null,
  bio            text,
  avatar_url     text,
  socials        jsonb not null default '{}'::jsonb,   -- { x, linkedin, web }
  role           public.user_role not null default 'author',
  follower_count int  not null default 0,              -- denormalized
  karma_total    int  not null default 0,              -- denormalized
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- admin check, SECURITY DEFINER so profile RLS does not recurse into itself
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically when an auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  candidate     text;
  suffix        int := 0;
begin
  base_username := lower(coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    split_part(new.email, '@', 1)
  ));
  -- sanitize to allowed charset
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if length(base_username) < 3 then
    base_username := 'user' || base_username;
  end if;
  base_username := left(base_username, 30);

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_username, 26) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), candidate)
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- category / tag
-- ---------------------------------------------------------------------------
create table public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ---------------------------------------------------------------------------
-- article
-- ---------------------------------------------------------------------------
create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  title         text not null,
  subtitle      text,
  slug          text not null,
  body          jsonb not null default '{}'::jsonb,    -- TipTap document JSON
  excerpt       text,
  cover_url     text,
  status        public.article_status not null default 'draft',
  reading_time  int  not null default 1,               -- minutes (computed in app)
  views         int  not null default 0,               -- denormalized
  karma_score   int  not null default 0,               -- denormalized = sum(votes.value)
  hot_score     numeric not null default 0,            -- time-decay, refreshed by cron + on vote
  published_at  timestamptz,
  scheduled_for timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (author_id, slug)
);

create index articles_status_published_idx on public.articles (status, published_at desc);
create index articles_hot_idx     on public.articles (status, hot_score desc);
create index articles_karma_idx   on public.articles (status, karma_score desc);
create index articles_author_idx  on public.articles (author_id);
create index articles_category_idx on public.articles (category_id);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- votes (article karma)
-- ---------------------------------------------------------------------------
create table public.votes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  value      int  not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create or replace function public.recount_article_karma()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  aid uuid := coalesce(new.article_id, old.article_id);
  aut uuid;
begin
  update public.articles a
     set karma_score = coalesce((select sum(value) from public.votes where article_id = aid), 0)
   where a.id = aid
  returning a.author_id into aut;

  update public.articles
     set hot_score = public.compute_hot_score(karma_score, published_at)
   where id = aid;

  if aut is not null then
    update public.profiles p
       set karma_total = coalesce((select sum(karma_score) from public.articles where author_id = aut), 0)
     where p.id = aut;
  end if;
  return null;
end; $$;

create trigger votes_recount
  after insert or update or delete on public.votes
  for each row execute function public.recount_article_karma();

-- ---------------------------------------------------------------------------
-- comments (threaded) + comment votes
-- ---------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  body        text not null check (length(body) between 1 and 10000),
  karma_score int  not null default 0,
  created_at  timestamptz not null default now()
);

create index comments_article_idx on public.comments (article_id, created_at);
create index comments_parent_idx  on public.comments (parent_id);

create table public.comment_votes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  value      int  not null check (value in (-1, 1)),
  primary key (user_id, comment_id)
);

create or replace function public.recount_comment_karma()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.comments
     set karma_score = coalesce((select sum(value) from public.comment_votes where comment_id = cid), 0)
   where id = cid;
  return null;
end; $$;

create trigger comment_votes_recount
  after insert or update or delete on public.comment_votes
  for each row execute function public.recount_comment_karma();

-- ---------------------------------------------------------------------------
-- follows + bookmarks
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create or replace function public.recount_followers()
returns trigger language plpgsql security definer set search_path = public as $$
declare fid uuid := coalesce(new.followed_id, old.followed_id);
begin
  update public.profiles p
     set follower_count = (select count(*) from public.follows where followed_id = fid)
   where p.id = fid;
  return null;
end; $$;

create trigger follows_recount
  after insert or delete on public.follows
  for each row execute function public.recount_followers();

create table public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- ---------------------------------------------------------------------------
-- Phase-2 tables (admin) — created now, used later
-- ---------------------------------------------------------------------------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('article', 'comment')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'hate', 'copyright', 'other')),
  note        text,
  status      text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at  timestamptz not null default now()
);

create table public.editorial_picks (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  position   int  not null default 0,
  curated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RPCs called from the app (SECURITY DEFINER to bypass RLS safely)
-- ---------------------------------------------------------------------------
-- atomic, race-free view increment
create or replace function public.increment_views(article uuid)
returns void language sql security definer set search_path = public as $$
  update public.articles set views = views + 1 where id = article;
$$;

-- periodic hot-score refresh (called by Supabase scheduled function / pg_cron)
create or replace function public.refresh_hot_scores()
returns void language sql security definer set search_path = public as $$
  update public.articles
     set hot_score = public.compute_hot_score(karma_score, published_at)
   where status = 'published';
$$;

-- flip scheduled articles whose time has come (called by scheduled function)
create or replace function public.publish_due_articles()
returns void language sql security definer set search_path = public as $$
  update public.articles
     set status = 'published', published_at = coalesce(published_at, scheduled_for)
   where status = 'scheduled' and scheduled_for <= now();
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.tags            enable row level security;
alter table public.articles        enable row level security;
alter table public.article_tags    enable row level security;
alter table public.votes           enable row level security;
alter table public.comments        enable row level security;
alter table public.comment_votes   enable row level security;
alter table public.follows         enable row level security;
alter table public.bookmarks       enable row level security;
alter table public.reports         enable row level security;
alter table public.editorial_picks enable row level security;

-- profiles: world-readable; owner edits own; insert handled by trigger but allow self-insert
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin());

-- categories / tags: world-readable; only admins mutate
create policy "categories read"  on public.categories for select using (true);
create policy "categories admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "tags read"  on public.tags for select using (true);
create policy "tags admin" on public.tags for all using (public.is_admin()) with check (public.is_admin());

-- articles: published visible to all; authors see/manage own; admins see all
create policy "articles read" on public.articles for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin());
create policy "articles insert" on public.articles for insert
  with check (author_id = auth.uid());
create policy "articles update" on public.articles for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "articles delete" on public.articles for delete
  using (author_id = auth.uid() or public.is_admin());

-- article_tags: readable with the article; mutated by the article's author
create policy "article_tags read" on public.article_tags for select using (true);
create policy "article_tags write" on public.article_tags for all
  using (exists (select 1 from public.articles a where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.articles a where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())));

-- votes: a user sees and manages only their own (aggregate count lives on articles.karma_score)
create policy "votes own read"   on public.votes for select using (user_id = auth.uid());
create policy "votes own write"  on public.votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- comments: world-readable; author creates own; author/admin edit & delete
create policy "comments read"   on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (author_id = auth.uid());
create policy "comments update" on public.comments for update
  using (author_id = auth.uid() or public.is_admin());
create policy "comments delete" on public.comments for delete
  using (author_id = auth.uid() or public.is_admin());

-- comment_votes: own only
create policy "comment_votes own read"  on public.comment_votes for select using (user_id = auth.uid());
create policy "comment_votes own write" on public.comment_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows: world-readable (follower lists); user manages own follow edges
create policy "follows read"  on public.follows for select using (true);
create policy "follows write" on public.follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- bookmarks: private to the user
create policy "bookmarks own" on public.bookmarks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: anyone logged-in files; only admins read/triage
create policy "reports insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports admin read"   on public.reports for select using (public.is_admin());
create policy "reports admin update" on public.reports for update using (public.is_admin());

-- editorial_picks: world-readable (drives the hero); admins curate
create policy "picks read"  on public.editorial_picks for select using (true);
create policy "picks admin" on public.editorial_picks for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: starter categories
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug) values
  ('Spoločnosť', 'spolocnost'),
  ('Politika',   'politika'),
  ('Technológie','technologie'),
  ('Kultúra',    'kultura'),
  ('Cestovanie', 'cestovanie'),
  ('Šport',      'sport'),
  ('Veda',       'veda'),
  ('Názory',     'nazory');
