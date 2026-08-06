-- ENDURECIMENTO DE SEGURANÇA — rode este script inteiro no SQL Editor do Supabase.
--
-- Problema que isso corrige: a tabela "agendamentos" tinha policies de RLS
-- permissivas (using(true)/with check(true)), então qualquer pessoa com a
-- chave anon (visível no código-fonte do site) conseguia ler, criar ou
-- apagar agendamentos direto pela API do Supabase, sem nunca passar pela
-- tela de login. A partir de agora, toda escrita/leitura sensível passa por
-- funções no banco que exigem um token de sessão válido, emitido só no login.

-- 1) Tabela de sessões (token emitido no login, com validade de 8 horas)
create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  role text not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);

alter table public.sessoes enable row level security;
-- Sem nenhuma policy: ninguém lê/escreve essa tabela direto via anon key,
-- só as funções abaixo (security definer) conseguem.

-- 2) Verifica se um token é válido e ainda não expirou; devolve o papel (role)
create or replace function public.validar_sessao(p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
begin
  if p_token is null then
    return null;
  end if;

  select role into v_role
  from public.sessoes
  where token = p_token and expira_em > now();

  return v_role;
end;
$$;

-- 3) Trava de força bruta: 5 tentativas erradas bloqueiam o usuário por 15 min
create table if not exists public.tentativas_login (
  username text primary key,
  falhas int not null default 0,
  bloqueado_ate timestamptz
);

alter table public.tentativas_login enable row level security;
-- Sem policies: só a função login_usuario (abaixo) acessa essa tabela.

-- 4) Login: confere usuário/senha, aplica a trava de força bruta e, se ok,
--    cria uma sessão e devolve o token
--    (precisa dropar antes: o formato de retorno mudou de (role,ok) pra (role,ok,token))
drop function if exists public.login_usuario(text, text);

create or replace function public.login_usuario(p_username text, p_password text)
returns table (role text, ok boolean, token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_role text;
  v_token text;
  v_bloqueado_ate timestamptz;
begin
  delete from public.sessoes where expira_em < now() - interval '1 day';

  select bloqueado_ate into v_bloqueado_ate
  from public.tentativas_login
  where username = p_username;

  if v_bloqueado_ate is not null and v_bloqueado_ate > now() then
    return query select null::text, false, null::text;
    return;
  end if;

  select u.password_hash, u.role into v_hash, v_role
  from public.usuarios u
  where u.username = p_username;

  if v_hash is null or v_hash <> crypt(p_password, v_hash) then
    insert into public.tentativas_login (username, falhas, bloqueado_ate)
    values (p_username, 1, null)
    on conflict (username) do update
      set falhas = tentativas_login.falhas + 1,
          bloqueado_ate = case
            when tentativas_login.falhas + 1 >= 5 then now() + interval '15 minutes'
            else null
          end;

    return query select null::text, false, null::text;
    return;
  end if;

  delete from public.tentativas_login where username = p_username;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.sessoes (token, role, expira_em)
  values (v_token, v_role, now() + interval '8 hours');

  return query select v_role, true, v_token;
end;
$$;

-- 5) Logout: invalida o token no servidor (não só localmente no navegador)
create or replace function public.logout_usuario(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.sessoes where token = p_token;
end;
$$;

-- 6) Criar agendamento — só com sessão válida (professor ou administrador)
create or replace function public.criar_agendamento(
  p_token text,
  p_nome_professor text,
  p_nome_materia text,
  p_data_hora timestamptz,
  p_aulas_agenda text,
  p_descricao_aula text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
begin
  v_role := public.validar_sessao(p_token);
  if v_role is null then
    raise exception 'Sessão inválida ou expirada. Faça login novamente.';
  end if;

  begin
    insert into public.agendamentos (nome_professor, nome_materia, data_hora, aulas_agenda, descricao_aula)
    values (p_nome_professor, p_nome_materia, p_data_hora, p_aulas_agenda, p_descricao_aula);
  exception when unique_violation then
    raise exception 'Esse horário já está agendado.';
  end;
end;
$$;

-- 7) Excluir agendamento — só administrador com sessão válida
create or replace function public.excluir_agendamento(p_token text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
begin
  v_role := public.validar_sessao(p_token);
  if v_role is distinct from 'administrador' then
    raise exception 'Não autorizado.';
  end if;

  delete from public.agendamentos where id = p_id;
end;
$$;

-- 8) Listar agendamentos com filtros — qualquer sessão válida (professor ou
--    administrador) pode LER; só excluir_agendamento continua exclusivo do admin.
-- Precisa dropar antes: adicionar o parâmetro p_aula muda a "assinatura" da
-- função (pro Postgres, isso cria uma função nova em vez de substituir a antiga).
drop function if exists public.listar_agendamentos(text, date, text, text);

create or replace function public.listar_agendamentos(
  p_token text,
  p_data date default null,
  p_professor text default null,
  p_materia text default null,
  p_aula text default null
) returns setof public.agendamentos
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
begin
  v_role := public.validar_sessao(p_token);
  if v_role is null then
    raise exception 'Sessão inválida ou expirada. Faça login novamente.';
  end if;

  return query
  select a.*
  from public.agendamentos a
  where (p_data is null or (a.data_hora >= p_data::timestamptz and a.data_hora < (p_data + 1)::timestamptz))
    and (p_professor is null or a.nome_professor ilike '%' || p_professor || '%')
    and (p_materia is null or a.nome_materia ilike '%' || p_materia || '%')
    and (p_aula is null or a.aulas_agenda = p_aula)
  order by a.data_hora asc;
end;
$$;

-- 9) Permissões: só quem precisa executa; validar_sessao é só uso interno
revoke all on function public.login_usuario(text, text) from public;
revoke all on function public.logout_usuario(text) from public;
revoke all on function public.criar_agendamento(text, text, text, timestamptz, text, text) from public;
revoke all on function public.excluir_agendamento(text, bigint) from public;
revoke all on function public.listar_agendamentos(text, date, text, text, text) from public;
revoke all on function public.validar_sessao(text) from public;

grant execute on function public.login_usuario(text, text) to anon, authenticated;
grant execute on function public.logout_usuario(text) to anon, authenticated;
grant execute on function public.criar_agendamento(text, text, text, timestamptz, text, text) to anon, authenticated;
grant execute on function public.excluir_agendamento(text, bigint) to anon, authenticated;
grant execute on function public.listar_agendamentos(text, date, text, text, text) to anon, authenticated;
-- validar_sessao NÃO é liberada pra anon/authenticated: só as funções acima chamam ela internamente.

-- 10) Remove TODAS as policies existentes em "agendamentos" (inclusive a de
--    INSERT que já vinha de antes) e mantém RLS ligado sem nenhuma policy.
--    Isso bloqueia qualquer acesso direto à tabela pela API — só as funções
--    acima (security definer) conseguem ler/escrever nela a partir de agora.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'agendamentos'
  loop
    execute format('drop policy %I on public.agendamentos', pol.policyname);
  end loop;
end $$;

alter table public.agendamentos enable row level security;
