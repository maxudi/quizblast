-- ============================================================
-- MIGRAÇÃO: streak e poder_ativo em jogadores
-- Execute no SQL Editor do Supabase
-- ============================================================

alter table public.jogadores
  add column if not exists streak      integer not null default 0,
  add column if not exists poder_ativo text    check (poder_ativo in ('eliminar2','mais_tempo','dobrar_pts','escudo'));
