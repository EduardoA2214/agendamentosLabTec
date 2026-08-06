-- Execute uma vez no SQL Editor do Supabase.
-- Garante, no próprio banco, que duas linhas não possam ter a mesma data_hora
-- (ou seja, o mesmo dia + mesma aula não pode ser agendado duas vezes),
-- mesmo se dois professores enviarem o formulário ao mesmo tempo.
create unique index if not exists agendamentos_data_hora_unique
  on public.agendamentos (data_hora);
