-- Execute este script no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Ele adapta a tabela "usuarios" (colunas atuais: id, user, password) para nomes
-- seguros em SQL, corrige o username do administrador, criptografa as senhas
-- (hoje em texto puro) e cria a função que verifica login dentro do banco, sem
-- nunca expor a senha ao navegador. Pode ser executado mais de uma vez.

-- 1) Extensão necessária para gerar/checar hash de senha (crypt/gen_salt)
create extension if not exists pgcrypto;

-- 2) Renomeia as colunas "user"/"password" para username/password_hash
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios' and column_name = 'user'
  ) then
    execute 'alter table public.usuarios rename column "user" to username';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios' and column_name = 'password'
  ) then
    execute 'alter table public.usuarios rename column "password" to password_hash';
  end if;
end $$;

-- 3) Corrige o username do administrador (estava salvo como 'adm')
update usuarios set username = 'administrador' where username = 'adm';

-- 4) Adiciona o papel (role) de cada usuário. Como hoje os únicos usuários
--    cadastrados são exatamente 'administrador' e 'professor', o papel é
--    igual ao próprio username.
alter table usuarios add column if not exists role text;
update usuarios set role = username where role is null;
alter table usuarios alter column role set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'usuarios_role_check') then
    alter table usuarios add constraint usuarios_role_check check (role in ('administrador', 'professor'));
  end if;
end $$;

-- 5) Criptografa as senhas que hoje estão em texto puro (idempotente: só
--    re-hasheia quem ainda não estiver no formato bcrypt "$2...")
update usuarios
set password_hash = crypt(password_hash, gen_salt('bf'))
where password_hash not like '$2%';

-- 6) Bloqueia qualquer acesso direto à tabela pela API pública.
--    Sem nenhuma policy criada, RLS ligado = ninguém lê/escreve via anon key.
alter table usuarios enable row level security;

-- 7) Função que verifica usuário/senha dentro do banco.
--    SECURITY DEFINER faz ela rodar com permissão do dono (ignorando RLS),
--    então consegue ler a tabela mesmo com o acesso direto bloqueado.
create or replace function public.login_usuario(p_username text, p_password text)
returns table (role text, ok boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_role text;
begin
  select u.password_hash, u.role into v_hash, v_role
  from public.usuarios u
  where u.username = p_username;

  if v_hash is null then
    return query select null::text, false;
    return;
  end if;

  if v_hash = crypt(p_password, v_hash) then
    return query select v_role, true;
  else
    return query select null::text, false;
  end if;
end;
$$;

-- 8) Permite que o front-end (chave anon) chame a função, mas nunca acesse a tabela direto
revoke all on function public.login_usuario(text, text) from public;
grant execute on function public.login_usuario(text, text) to anon, authenticated;

-- 9) Corrige o mesmo problema de nome de coluna (id numérico com outro nome) na
--    tabela agendamentos, necessário para excluir/editar um agendamento específico.
do $$
declare
  v_id_col text;
begin
  select column_name into v_id_col
  from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos'
    and data_type in ('bigint', 'integer') and column_name <> 'id'
  limit 1;

  if v_id_col is not null then
    execute format('alter table public.agendamentos rename column %I to id', v_id_col);
  end if;
end $$;
