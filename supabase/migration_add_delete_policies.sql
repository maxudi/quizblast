-- ============================================================
-- MIGRAÇÃO: políticas de DELETE para jogadores e respostas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- jogadores: professor autenticado pode deletar (ao reiniciar jogo)
create policy "jogadores_delete_authenticated"
  on public.jogadores for delete
  using (auth.role() = 'authenticated');

-- respostas: professor autenticado pode deletar (ao reiniciar jogo)
create policy "respostas_delete_authenticated"
  on public.respostas for delete
  using (auth.role() = 'authenticated');
