-- ============================================================
-- KAHOOT CLONE — Schema do Banco de Dados (Supabase / PostgreSQL)
-- ============================================================

-- gen_random_uuid() é nativo do PostgreSQL 13+ (usado pelo Supabase)
-- Não é necessário criar nenhuma extensão para geração de UUIDs.

-- ------------------------------------------------------------
-- TABELA: jogos
-- ------------------------------------------------------------
create table public.jogos (
  id              uuid        primary key default gen_random_uuid(),
  pin_sala        varchar(6)  not null unique,
  titulo          text        not null,
  status          text        not null default 'aguardando'
                              check (status in ('aguardando', 'em_andamento', 'finalizado')),
  -- FK para questao_atual_id adicionada após criar a tabela questoes
  questao_atual_id uuid,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TABELA: questoes
-- ------------------------------------------------------------
create table public.questoes (
  id           uuid      primary key default gen_random_uuid(),
  jogo_id      uuid      not null references public.jogos(id) on delete cascade,
  ordem        integer   not null,
  pergunta     text      not null,
  alt_a        text      not null,
  alt_b        text      not null,
  alt_c        text      not null,
  alt_d        text      not null,
  correta      char(1)   not null check (correta in ('A', 'B', 'C', 'D')),
  tempo_limite integer   not null default 30,
  criado_em    timestamptz not null default now(),
  constraint questoes_jogo_ordem_unique unique (jogo_id, ordem)
);

-- FK circular: jogos.questao_atual_id → questoes.id (adicionada após criar questoes)
alter table public.jogos
  add constraint jogos_questao_atual_id_fkey
  foreign key (questao_atual_id)
  references public.questoes(id)
  on delete set null;

-- ------------------------------------------------------------
-- TABELA: jogadores
-- ------------------------------------------------------------
create table public.jogadores (
  id               uuid      primary key default gen_random_uuid(),
  jogo_id          uuid      not null references public.jogos(id) on delete cascade,
  nome             text      not null,
  avatar           text      not null default '🎮',
  pontuacao        integer   not null default 0,
  status_conexao   text      not null default 'online'
                             check (status_conexao in ('online', 'offline')),
  entrou_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------
create index idx_jogos_pin_sala       on public.jogos(pin_sala);
create index idx_questoes_jogo_id     on public.questoes(jogo_id);
create index idx_questoes_ordem       on public.questoes(jogo_id, ordem);
create index idx_jogadores_jogo_id    on public.jogadores(jogo_id);
create index idx_jogadores_pontuacao  on public.jogadores(jogo_id, pontuacao desc);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
alter table public.jogos      enable row level security;
alter table public.questoes   enable row level security;
alter table public.jogadores  enable row level security;

-- jogos: leitura pública, escrita somente para autenticados (host)
create policy "jogos_select_public"
  on public.jogos for select using (true);

create policy "jogos_insert_authenticated"
  on public.jogos for insert
  with check (auth.role() = 'authenticated');

create policy "jogos_update_authenticated"
  on public.jogos for update
  using (auth.role() = 'authenticated');

-- questoes: leitura pública, escrita somente para autenticados (host)
create policy "questoes_select_public"
  on public.questoes for select using (true);

create policy "questoes_insert_authenticated"
  on public.questoes for insert
  with check (auth.role() = 'authenticated');

create policy "questoes_update_authenticated"
  on public.questoes for update
  using (auth.role() = 'authenticated');

-- jogadores: leitura pública, qualquer pessoa pode inserir (player anônimo)
create policy "jogadores_select_public"
  on public.jogadores for select using (true);

create policy "jogadores_insert_public"
  on public.jogadores for insert with check (true);

create policy "jogadores_update_public"
  on public.jogadores for update using (true);

-- ------------------------------------------------------------
-- SUPABASE REALTIME — Habilitar pelo painel (não via SQL)
-- ------------------------------------------------------------
-- O comando ALTER PUBLICATION exige superuser e não pode ser executado
-- pelo SQL Editor. Habilite o Realtime manualmente:
--
--   Dashboard → Database → Replication → supabase_realtime
--   → Ative as tabelas: jogos  e  jogadores
-- ------------------------------------------------------------

-- REPLICA IDENTITY FULL: necessário para que o Realtime envie os dados
-- completos da linha em eventos UPDATE/DELETE e para que filtros
-- server-side funcionem em colunas que não são PRIMARY KEY.
alter table public.jogos      replica identity full;
alter table public.jogadores  replica identity full;

-- ------------------------------------------------------------
-- FUNÇÃO: atualiza coluna atualizado_em automaticamente
-- ------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_jogos_atualizado_em
  before update on public.jogos
  for each row execute procedure public.set_atualizado_em();

create trigger trg_jogadores_atualizado_em
  before update on public.jogadores
  for each row execute procedure public.set_atualizado_em();
