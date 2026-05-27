-- 제안서 첨부 저장소
insert into storage.buckets (id, name, public)
values ('proposals', 'proposals', false)
on conflict (id) do nothing;

-- 조직 멤버만 자신의 조직 폴더에 read/write 가능
create policy "proposals read" on storage.objects for select
  using (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = (
      select organization_id::text from public.profiles where id = auth.uid()
    )
  );

create policy "proposals write" on storage.objects for insert
  with check (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = (
      select organization_id::text from public.profiles where id = auth.uid()
    )
  );

create policy "proposals delete" on storage.objects for delete
  using (
    bucket_id = 'proposals'
    and (storage.foldername(name))[1] = (
      select organization_id::text from public.profiles where id = auth.uid()
    )
  );
