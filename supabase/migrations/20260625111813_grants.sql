-- PostgREST role privileges.
-- RLS (enabled on every table in the init migration) decides which ROWS each role
-- may see/change. These GRANTs give the API roles the base table privilege — tables
-- created by raw SQL migrations do NOT inherit Supabase's default grants, so without
-- this PostgREST returns "permission denied for table ...".

grant usage on schema public to anon, authenticated;

-- Read: anon + authenticated. RLS still filters rows (e.g. anon sees only published
-- articles; votes/bookmarks/reports expose no rows to anon).
grant select on all tables in schema public to anon, authenticated;

-- Write: logged-in users only. RLS gates these to the user's own rows, and to admins
-- for admin-only tables (categories, tags, reports, editorial_picks).
grant insert, update, delete on all tables in schema public to authenticated;

-- Sequences (safe for any future serial/identity columns).
grant usage, select on all sequences in schema public to anon, authenticated;

-- RPC called from the app with the anon or user session.
grant execute on function public.increment_views(uuid) to anon, authenticated;

-- Keep future objects in sync so later migrations need not repeat grants.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
