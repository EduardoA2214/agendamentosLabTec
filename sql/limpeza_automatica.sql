-- Exclusão automática de agendamentos com data já passada, nas duas salas.
-- Execute este script uma vez no SQL Editor do Supabase.
--
-- Se o "create extension pg_cron" der erro de permissão, ative a extensão
-- primeiro pelo painel: Database > Extensions > procure "pg_cron" > Enable.
-- Depois disso, rode o script de novo.

create extension if not exists pg_cron;

-- Remove o agendamento (se já existir) antes de recriar, pra poder rodar
-- este script mais de uma vez sem erro.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'limpar_agendamentos_passados') then
    perform cron.unschedule('limpar_agendamentos_passados');
  end if;
end $$;

-- Todo dia às 03:00 (horário do servidor do Supabase, geralmente UTC),
-- apaga qualquer agendamento cuja data já virou (o dia inteiro precisa ter
-- passado — os agendamentos de hoje só são removidos a partir de amanhã).
select cron.schedule(
  'limpar_agendamentos_passados',
  '0 3 * * *',
  $$
    delete from public.agendamentos where data_hora < current_date;
    delete from public.agendamentos_video where data_hora_video < current_date;
  $$
);
