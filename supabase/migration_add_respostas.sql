-- ============================================================
-- MIGRAÇÃO: tabela respostas + campo questao_iniciada_em em jogos
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona timestamp de início da questão atual ao jogo
alter table public.jogos
  add column if not exists questao_iniciada_em timestamptz;

-- 2. Tabela de respostas dos jogadores
create table if not exists public.respostas (
  id          uuid        primary key default gen_random_uuid(),
  jogo_id     uuid        not null references public.jogos(id)     on delete cascade,
  questao_id  uuid        not null references public.questoes(id)  on delete cascade,
  jogador_id  uuid        not null references public.jogadores(id) on delete cascade,
  resposta    char(1)     check (resposta in ('A', 'B', 'C', 'D')),
  correta     boolean     not null default false,
  tempo_ms    integer     not null default 0,
  pontos      integer     not null default 0,
  criado_em   timestamptz not null default now(),
  constraint  respostas_unique unique (questao_id, jogador_id)
);

create index if not exists idx_respostas_questao on public.respostas(questao_id);
create index if not exists idx_respostas_jogo    on public.respostas(jogo_id);

-- 3. RLS
alter table public.respostas enable row level security;

create policy "respostas_select_public" on public.respostas for select using (true);
create policy "respostas_insert_public" on public.respostas for insert with check (true);

-- 4. Replica identity para Realtime (quando habilitado)
alter table public.respostas replica identity full;
