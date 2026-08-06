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

// --- Consulta de horários já agendados (somente leitura, sem excluir) ---

const listaEl = document.getElementById('lista-agendamentos');
const contadorEl = document.getElementById('contador-resultados');
const filtroData = document.getElementById('filtro-data');
const filtroAula = document.getElementById('filtro-aula');

function formatarDataHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return valor;
  return d.toLocaleString('pt-BR');
}

function celulaMensagem(mensagem) {
  listaEl.innerHTML = '';
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 5;
  td.className = 'vazio';
  td.textContent = mensagem;
  tr.appendChild(td);
  listaEl.appendChild(tr);
}

function renderizarAgendamentos(agendamentos) {
  listaEl.innerHTML = '';
  contadorEl.textContent = agendamentos
    ? `${agendamentos.length} agendamento${agendamentos.length === 1 ? '' : 's'}`
    : '';

  if (!agendamentos || agendamentos.length === 0) {
    celulaMensagem('Nenhum agendamento encontrado.');
    return;
  }

  agendamentos.forEach((item) => {
    const tr = document.createElement('tr');

    const campos = [
      item.nome_professor,
      item.nome_materia,
      formatarDataHora(item.data_hora),
      item.aulas_agenda || '-',
      item.descricao_aula || '-'
    ];
    campos.forEach((texto) => {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.appendChild(td);
    });

    listaEl.appendChild(tr);
  });
}

const MENSAGEM_INICIAL = 'Escolha a data e/ou a aula para consultar.';

async function carregarAgendamentos() {
  const data = filtroData.value;
  const numeroAula = filtroAula.value;

  // Só busca se data e/ou aula foram escolhidos — não lista todos os
  // agendamentos de uma vez, só o horário que o professor quer conferir.
  if (!data && !numeroAula) {
    celulaMensagem(MENSAGEM_INICIAL);
    contadorEl.textContent = '';
    return;
  }

  celulaMensagem('Carregando...');

  // Só leitura: professor pode consultar horários, mas não tem acesso à
  // função de exclusão (essa continua exclusiva do administrador).
  const { data: agendamentos, error } = await supabaseClient.rpc('listar_agendamentos', {
    p_token: sessao.token,
    p_data: data || null,
    p_professor: null,
    p_materia: null,
    p_aula: numeroAula ? rotuloAula(numeroAula) : null
  });

  if (error) {
    celulaMensagem('Erro ao carregar: ' + error.message);
    contadorEl.textContent = '';
    console.error('Erro detalhado:', error);
    return;
  }

  renderizarAgendamentos(agendamentos);
}

document.getElementById('btn-buscar').addEventListener('click', carregarAgendamentos);

document.getElementById('btn-limpar').addEventListener('click', () => {
  filtroData.value = '';
  filtroAula.value = '';
  celulaMensagem(MENSAGEM_INICIAL);
  contadorEl.textContent = '';
});

celulaMensagem(MENSAGEM_INICIAL);
