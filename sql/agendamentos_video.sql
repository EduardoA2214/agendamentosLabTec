-- Sala de Vídeo — replica o mesmo padrão de agendamento da sala de
-- informática (tabela "agendamentos"), agora para "agendamentos_video".
-- Execute este script inteiro no SQL Editor do Supabase.

-- 1) Trava contra dois agendamentos no mesmo horário nessa sala
create unique index if not exists agendamentos_video_data_hora_unique
  on public.agendamentos_video (data_hora_video);

-- 2) Bloqueia acesso direto à tabela pela API — só as funções abaixo
--    (security definer) conseguem ler/escrever, igual já é em "agendamentos".
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'agendamentos_video'
  loop
    execute format('drop policy %I on public.agendamentos_video', pol.policyname);
  end loop;
end $$;

alter table public.agendamentos_video enable row level security;

-- 3) Criar agendamento na sala de vídeo — exige sessão válida (token do login)
create or replace function public.criar_agendamento_video(
  p_token text,
  p_nome_professor text,
  p_nome_materia text,
  p_data_hora timestamp,
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
    insert into public.agendamentos_video (
      nome_professor_video, nome_materia_video, data_hora_video, aulas_agenda_video, descricao_aula_video
    )
    values (p_nome_professor, p_nome_materia, p_data_hora, p_aulas_agenda, p_descricao_aula);
  exception when unique_violation then
    raise exception 'Esse horário já está agendado na sala de vídeo.';
  end;
end;
$$;

-- 4) Listar agendamentos da sala de vídeo — qualquer sessão válida pode ler
--    (professor ou administrador); exclusão continua exclusiva do admin.
create or replace function public.listar_agendamentos_video(
  p_token text,
  p_data date default null,
  p_professor text default null,
  p_materia text default null,
  p_aula text default null
) returns setof public.agendamentos_video
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
  from public.agendamentos_video a
  where (p_data is null or (a.data_hora_video >= p_data::timestamp and a.data_hora_video < (p_data + 1)::timestamp))
    and (p_professor is null or a.nome_professor_video ilike '%' || p_professor || '%')
    and (p_materia is null or a.nome_materia_video ilike '%' || p_materia || '%')
    and (p_aula is null or a.aulas_agenda_video = p_aula)
  order by a.data_hora_video asc;
end;
$$;

-- 5) Excluir agendamento da sala de vídeo — só administrador
--    (pronta para quando o painel do admin passar a gerenciar essa sala também)
create or replace function public.excluir_agendamento_video(p_token text, p_id bigint)
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

  delete from public.agendamentos_video where id = p_id;
end;
$$;

-- 6) Permissões
revoke all on function public.criar_agendamento_video(text, text, text, timestamp, text, text) from public;
revoke all on function public.listar_agendamentos_video(text, date, text, text, text) from public;
revoke all on function public.excluir_agendamento_video(text, bigint) from public;

grant execute on function public.criar_agendamento_video(text, text, text, timestamp, text, text) to anon, authenticated;
grant execute on function public.listar_agendamentos_video(text, date, text, text, text) to anon, authenticated;
grant execute on function public.excluir_agendamento_video(text, bigint) to anon, authenticated;
