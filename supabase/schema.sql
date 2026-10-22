-- Capacidade Produtiva — esquema do banco (Supabase/PostgreSQL). Execute no SQL Editor do projeto.
create table if not exists perfis (
  id uuid primary key references auth.users on delete cascade,
  email text,
  papel text not null default 'leitor' check (papel in ('leitor', 'editor', 'admin'))
);
create table if not exists capacidade_estado (
  id text primary key,                       -- 'oficial'
  estado jsonb not null,                     -- parâmetros, plano, tempos, turnos, células, cenários salvos
  atualizado_por uuid references auth.users,
  atualizado_em timestamptz not null default now()
);
create table if not exists capacidade_historico (
  id bigint generated always as identity primary key,
  usuario uuid references auth.users,
  campo text not null, de text, para text,
  quando timestamptz not null default now()
);

alter table perfis enable row level security;
alter table capacidade_estado enable row level security;
alter table capacidade_historico enable row level security;

create or replace function papel_atual() returns text language sql stable security definer set search_path = public as
  $$ select papel from perfis where id = auth.uid() $$;

create policy "perfil próprio" on perfis for select using (id = auth.uid());
create policy "ler estado" on capacidade_estado for select to authenticated using (true);
create policy "editar estado" on capacidade_estado for insert to authenticated with check (papel_atual() in ('editor', 'admin'));
create policy "atualizar estado" on capacidade_estado for update to authenticated using (papel_atual() in ('editor', 'admin'));
create policy "ler histórico" on capacidade_historico for select to authenticated using (true);
create policy "gravar histórico" on capacidade_historico for insert to authenticated with check (papel_atual() in ('editor', 'admin'));

-- novo usuário entra como 'leitor'; promova com: update perfis set papel = 'admin' where email = '...';
create or replace function novo_usuario() returns trigger language plpgsql security definer set search_path = public as
  $$ begin insert into perfis (id, email) values (new.id, new.email); return new; end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function novo_usuario();
