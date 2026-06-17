-- Public avatars bucket for profile pictures. Writes happen server-side via the
-- service-role client (bypasses RLS); only public READ is granted here so <img>
-- tags resolve. No anon/authenticated write policy on purpose.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
