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
  const descricao_aula = document.getElementById('descricao_aula').value;

  const aulasSelecionadas = Array.from(document.querySelectorAll('input[name="aula"]:checked'))
    .map((cb) => cb.value)
    .sort((a, b) => Number(a) - Number(b));

  if (aulasSelecionadas.length === 0) {
    erroEl.textContent = 'Selecione ao menos uma aula.';
    return;
  }

  if (!ehDiaUtil(data)) {
    erroEl.textContent = 'Só é possível agendar de segunda a sexta-feira.';
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Verificando...';

  // 1) Antes de criar qualquer coisa, checa quais das aulas marcadas já
  // estão ocupadas nesse dia (consulta somente leitura).
  const { data: existentes, error: erroConsulta } = await supabaseClient.rpc('listar_agendamentos', {
    p_token: sessao.token,
    p_data: data,
    p_professor: null,
    p_materia: null,
    p_aula: null
  });

  if (erroConsulta) {
    erroEl.textContent = 'Erro ao verificar horários: ' + erroConsulta.message;
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Confirmar Agendamento';
    return;
  }

  const rotulosOcupados = new Set((existentes || []).map((item) => item.aulas_agenda));
  const aulasOcupadas = aulasSelecionadas.filter((n) => rotulosOcupados.has(rotuloAula(n)));
  const aulasLivres = aulasSelecionadas.filter((n) => !rotulosOcupados.has(rotuloAula(n)));

  if (aulasOcupadas.length > 0) {
    if (aulasLivres.length === 0) {
      erroEl.textContent = 'Todas as aulas selecionadas já estão agendadas: ' + aulasOcupadas.map(rotuloAula).join(', ');
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Confirmar Agendamento';
      return;
    }

    const mensagem = `Atenção: ${aulasOcupadas.map(rotuloAula).join(', ')} já está(ão) agendada(s). ` +
      `Deseja confirmar o agendamento das outras ${aulasLivres.length} aula(s) disponível(is)?`;
    const autorizado = await confirmar(mensagem, { aviso: true });

    if (!autorizado) {
      erroEl.textContent = 'Agendamento cancelado — nenhuma aula foi reservada.';
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Confirmar Agendamento';
      return;
    }
  }

  const aulasParaCriar = aulasOcupadas.length > 0 ? aulasLivres : aulasSelecionadas;

  btnSubmit.innerText = 'Enviando...';

  // 2) Cria um agendamento por aula liberada. A função criar_agendamento
  // também recheca o conflito no banco (segurança contra duas pessoas
  // agendando ao mesmo tempo entre a verificação acima e este envio).
  const rotulosComFalha = [];
  let totalCriado = 0;

  for (const numeroAula of aulasParaCriar) {
    const data_hora = montarDataHora(data, numeroAula);

    const { error } = await supabaseClient.rpc('criar_agendamento', {
      p_token: sessao.token,
      p_nome_professor: nome_professor,
      p_nome_materia: nome_materia,
      p_data_hora: data_hora,
      p_aulas_agenda: rotuloAula(numeroAula),
      p_descricao_aula: descricao_aula
    });

    if (error) {
      rotulosComFalha.push(rotuloAula(numeroAula));
      console.error('Erro detalhado:', error);
    } else {
      totalCriado++;
    }
  }

  btnSubmit.disabled = false;
  btnSubmit.innerText = 'Confirmar Agendamento';

  if (totalCriado > 0 && rotulosComFalha.length === 0) {
    mostrarToast(
      totalCriado === 1 ? 'Agendamento realizado com sucesso!' : `${totalCriado} agendamentos realizados com sucesso!`,
      'sucesso'
    );
    form.reset();
  } else if (totalCriado > 0 && rotulosComFalha.length > 0) {
    mostrarToast(`${totalCriado} agendamento(s) criado(s). Já estava(m) ocupado(s): ${rotulosComFalha.join(', ')}.`, 'erro');
  } else {
    erroEl.textContent = 'Nenhum agendamento criado — já estava(m) ocupado(s): ' + rotulosComFalha.join(', ');
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
