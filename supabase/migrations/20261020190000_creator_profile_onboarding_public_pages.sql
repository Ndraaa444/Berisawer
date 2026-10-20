-- Keep creator profile timestamps accurate when a creator edits their public page.
create or replace function public.set_creator_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_profiles_updated_at on public.creator_profiles;
create trigger creator_profiles_updated_at
before update on public.creator_profiles
for each row execute function public.set_creator_profile_updated_at();

drop policy if exists "Public can view public creator profiles" on public.creator_profiles;
create policy "Public can view public creator profiles"
on public.creator_profiles
for select
to anon, authenticated
using (is_public = true);
