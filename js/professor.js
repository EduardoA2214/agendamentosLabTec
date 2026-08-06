// Só deixa continuar se houver sessão de professor; senão volta pro login
const sessao = exigirPapel('professor', '../index.html');

configurarLogout('btn-logout', '../index.html');

const form = document.getElementById('form-agendamento');
const btnSubmit = document.getElementById('btn-submit');
const erroEl = document.getElementById('erro-agendamento');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.textContent = '';

  const nome_professor = document.getElementById('professor').value;
  const nome_materia = document.getElementById('materia').value;
  const data = document.getElementById('data').value;
  const numeroAula = document.getElementById('aula').value;
  const descricao_aula = document.getElementById('descricao_aula').value;

  if (!ehDiaUtil(data)) {
    erroEl.textContent = 'Só é possível agendar de segunda a sexta-feira.';
    return;
  }

  const data_hora = montarDataHora(data, numeroAula);

  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Enviando...';

  try {
    // A checagem de sessão e de conflito de horário acontece dentro do banco
    // (função criar_agendamento) — o front-end nunca escreve direto na tabela.
    const { error } = await supabaseClient.rpc('criar_agendamento', {
      p_token: sessao.token,
      p_nome_professor: nome_professor,
      p_nome_materia: nome_materia,
      p_data_hora: data_hora,
      p_aulas_agenda: rotuloAula(numeroAula),
      p_descricao_aula: descricao_aula
    });

    if (error) throw error;

    mostrarToast('Agendamento realizado com sucesso!', 'sucesso');
    form.reset();

  } catch (err) {
    erroEl.textContent = 'Erro ao realizar agendamento: ' + err.message;
    console.error('Erro detalhado:', err);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Confirmar Agendamento';
  }
});
