// Só deixa continuar se houver sessão de administrador; senão volta pro login
const sessao = exigirPapel('administrador', '../index.html');

configurarLogout('btn-logout', '../index.html');

const listaEl = document.getElementById('lista-agendamentos');
const contadorEl = document.getElementById('contador-resultados');

const filtroData = document.getElementById('filtro-data');
const filtroProfessor = document.getElementById('filtro-professor');
const filtroMateria = document.getElementById('filtro-materia');

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
  td.colSpan = 6;
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
      ['Professor', item.nome_professor],
      ['Matéria', item.nome_materia],
      ['Data/Hora', formatarDataHora(item.data_hora)],
      ['Aula', item.aulas_agenda || '-'],
      ['Descrição', item.descricao_aula || '-']
    ];
    campos.forEach(([rotulo, texto]) => {
      const td = document.createElement('td');
      td.dataset.label = rotulo;
      td.textContent = texto;
      tr.appendChild(td);
    });

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'acoes';
    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'danger';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.addEventListener('click', () => excluirAgendamento(item.id));
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);

    listaEl.appendChild(tr);
  });
}

async function carregarAgendamentos() {
  celulaMensagem('Carregando...');

  const professor = filtroProfessor.value.trim();
  const materia = filtroMateria.value.trim();
  const data = filtroData.value;

  // A checagem de sessão e os filtros acontecem dentro do banco (função
  // listar_agendamentos) — o front-end não lê a tabela diretamente.
  const { data: agendamentos, error } = await supabaseClient.rpc('listar_agendamentos', {
    p_token: sessao.token,
    p_data: data || null,
    p_professor: professor || null,
    p_materia: materia || null
  });

  if (error) {
    celulaMensagem('Erro ao carregar: ' + error.message);
    contadorEl.textContent = '';
    console.error('Erro detalhado:', error);
    return;
  }

  renderizarAgendamentos(agendamentos);
}

async function excluirAgendamento(id) {
  const confirmado = await confirmar('Tem certeza que deseja excluir este agendamento? Essa ação não pode ser desfeita.');
  if (!confirmado) return;

  const { error } = await supabaseClient.rpc('excluir_agendamento', {
    p_token: sessao.token,
    p_id: id
  });

  if (error) {
    mostrarToast('Erro ao excluir: ' + error.message, 'erro');
    console.error('Erro detalhado:', error);
    return;
  }

  mostrarToast('Agendamento excluído com sucesso.', 'sucesso');
  carregarAgendamentos();
}

document.getElementById('btn-buscar').addEventListener('click', carregarAgendamentos);

document.getElementById('btn-limpar').addEventListener('click', () => {
  filtroData.value = '';
  filtroProfessor.value = '';
  filtroMateria.value = '';
  carregarAgendamentos();
});

// Busca também ao apertar Enter em qualquer campo de filtro de texto
[filtroProfessor, filtroMateria].forEach((campo) => {
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') carregarAgendamentos();
  });
});

carregarAgendamentos();
