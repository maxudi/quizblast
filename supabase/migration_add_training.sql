-- ============================================================
-- MIGRAÇÃO: Modo Treino
-- Adiciona tipo e parent_quiz_id a jogos, torna host_id nullable
-- e cria políticas RLS para sessões de treino (anônimas).
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Permitir host_id nulo (sessões de treino não têm professor)
alter table public.jogos
  alter column host_id drop not null;

-- 2. Coluna tipo e referência ao quiz original
alter table public.jogos
  add column if not exists tipo text not null default 'normal'
    check (tipo in ('normal', 'treino')),
  add column if not exists parent_quiz_id uuid
    references public.jogos(id) on delete cascade;

create index if not exists idx_jogos_parent_quiz on public.jogos(parent_quiz_id);
create index if not exists idx_jogos_tipo        on public.jogos(tipo);

-- 3. RLS — qualquer um pode criar sessão de treino
create policy "jogos_insert_treino" on public.jogos
  for insert
  with check (tipo = 'treino' and host_id is null);

-- 4. RLS — qualquer um pode atualizar sessão de treino
--    (gerente avança questões, sem autenticação)
create policy "jogos_update_treino" on public.jogos
  for update
  using  (tipo = 'treino')
  with check (tipo = 'treino');
