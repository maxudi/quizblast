-- ============================================================
-- MIGRAÇÃO: adiciona host_id à tabela jogos
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona coluna host_id vinculada ao usuário autenticado
alter table public.jogos
  add column if not exists host_id uuid references auth.users(id) on delete cascade;

-- 2. Atualiza RLS: professor só vê/edita seus próprios jogos
drop policy if exists "jogos_select_public"           on public.jogos;
drop policy if exists "jogos_insert_authenticated"    on public.jogos;
drop policy if exists "jogos_update_authenticated"    on public.jogos;
drop policy if exists "jogos_delete_authenticated"    on public.jogos;

-- Leitura: jogos públicos (alunos precisam buscar pelo PIN) + host vê os seus
create policy "jogos_select_public"
  on public.jogos for select using (true);

-- Insert: authenticated insere com host_id = seu próprio uid
create policy "jogos_insert_authenticated"
  on public.jogos for insert
  with check (auth.uid() = host_id);

-- Update: somente o dono do jogo pode atualizar
create policy "jogos_update_authenticated"
  on public.jogos for update
  using (auth.uid() = host_id);

-- Delete: somente o dono pode apagar
create policy "jogos_delete_authenticated"
  on public.jogos for delete
  using (auth.uid() = host_id);

-- 3. Habilitar replica identity (necessário para Realtime)
alter table public.jogos     replica identity full;
alter table public.jogadores replica identity full;
