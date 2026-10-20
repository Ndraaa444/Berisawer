-- Consolidate creator profile read rules while preserving owner access to private profiles.
drop policy if exists "Creators can view own profile" on public.creator_profiles;
drop policy if exists "Public can view public creator profiles" on public.creator_profiles;
create policy "Owners and public profiles can be read"
on public.creator_profiles
for select
to anon, authenticated
using (is_public = true or id = (select auth.uid()));
