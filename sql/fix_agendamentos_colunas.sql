-- Renomeia as colunas de "agendamentos" pela POSIÇÃO (não pelo nome), pra
-- evitar de vez qualquer problema de caractere invisível/acentuação diferente
-- do que aparece na tela. Depois disso todas as colunas ficam em ASCII puro.
do $$
declare
  v_col text;
begin
  select column_name into v_col from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos' and ordinal_position = 2;
  if v_col is not null and v_col <> 'nome_professor' then
    execute format('alter table public.agendamentos rename column %I to nome_professor', v_col);
  end if;

  select column_name into v_col from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos' and ordinal_position = 3;
  if v_col is not null and v_col <> 'nome_materia' then
    execute format('alter table public.agendamentos rename column %I to nome_materia', v_col);
  end if;

  select column_name into v_col from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos' and ordinal_position = 4;
  if v_col is not null and v_col <> 'data_hora' then
    execute format('alter table public.agendamentos rename column %I to data_hora', v_col);
  end if;

  select column_name into v_col from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos' and ordinal_position = 5;
  if v_col is not null and v_col <> 'aulas_agenda' then
    execute format('alter table public.agendamentos rename column %I to aulas_agenda', v_col);
  end if;

  select column_name into v_col from information_schema.columns
  where table_schema = 'public' and table_name = 'agendamentos' and ordinal_position = 6;
  if v_col is not null and v_col <> 'descricao_aula' then
    execute format('alter table public.agendamentos rename column %I to descricao_aula', v_col);
  end if;
end $$;

select column_name, data_type, ordinal_position
from information_schema.columns
where table_schema = 'public' and table_name = 'agendamentos'
order by ordinal_position;
