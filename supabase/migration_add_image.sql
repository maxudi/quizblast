-- ============================================================
-- MIGRAÇÃO: coluna imagem_url em questoes
-- Execute no SQL Editor do Supabase
-- ============================================================

alter table public.questoes
  add column if not exists imagem_url text;

-- ============================================================
-- Storage Bucket (configure manualmente no Dashboard):
-- ============================================================
-- 1. Supabase Dashboard → Storage → New Bucket
-- 2. Nome: questao-imagens
-- 3. Marque "Public bucket" ✓ → Save
--
-- Após criar o bucket, rode a policy abaixo:
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'imagens_insert_authenticated'
  ) then
    execute $p$
      create policy "imagens_insert_authenticated"
        on storage.objects for insert
        to authenticated
        with check (bucket_id = 'questao-imagens')
    $p$;
  end if;
end;
$$;
