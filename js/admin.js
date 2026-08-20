// Só deixa continuar se houver sessão de administrador; senão volta pro login
const sessao = exigirPapel('administrador', '../index.html');

configurarLogout('btn-logout', '../index.html');

// Config de cada sala: qual função RPC chamar e qual o nome real de cada
// coluna na tabela dela (a tabela de vídeo usa sufixo "_video" nos nomes).
const SALAS = {
  informatica: {
    nome: 'Sala de Informática',
    listar: 'listar_agendamentos',
    excluir: 'excluir_agendamento',
    campo: {
      id: 'id',
      professor: 'nome_professor',
      materia: 'nome_materia',
      data_hora: 'data_hora',
      aula: 'aulas_agenda',
      descricao: 'descricao_aula'
    }
  },
  video: {
    nome: 'Sala de Vídeo',
    listar: 'listar_agendamentos_video',
    excluir: 'excluir_agendamento_video',
    campo: {
      id: 'id',
      professor: 'nome_professor_video',
      materia: 'nome_materia_video',
      data_hora: 'data_hora_video',
      aula: 'aulas_agenda_video',
      descricao: 'descricao_aula_video'
    }
  }
};

let salaAtual = 'informatica';

const listaEl = document.getElementById('lista-agendamentos');
const contadorEl = document.getElementById('contador-resultados');
const tituloTabelaEl = document.getElementById('titulo-tabela');

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
  const campo = SALAS[salaAtual].campo;

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
      ['Professor', item[campo.professor]],
      ['Matéria', item[campo.materia]],
      ['Data/Hora', formatarDataHora(item[campo.data_hora])],
      ['Aula', item[campo.aula] || '-'],
      ['Descrição', item[campo.descricao] || '-']
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
    btnExcluir.addEventListener('click', () => excluirAgendamento(item[campo.id]));
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

  // A checagem de sessão e os filtros acontecem dentro do banco — o
  // front-end não lê a tabela diretamente, só chama a função da sala atual.
  const { data: agendamentos, error } = await supabaseClient.rpc(SALAS[salaAtual].listar, {
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

  const { error } = await supabaseClient.rpc(SALAS[salaAtual].excluir, {
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

document.querySelectorAll('.aba-sala').forEach((aba) => {
  aba.addEventListener('click', () => {
    if (aba.dataset.sala === salaAtual) return;

    salaAtual = aba.dataset.sala;

    document.querySelectorAll('.aba-sala').forEach((outra) => outra.classList.remove('ativa'));
    aba.classList.add('ativa');

    tituloTabelaEl.textContent = `Agendamentos — ${SALAS[salaAtual].nome}`;

    filtroData.value = '';
    filtroProfessor.value = '';
    filtroMateria.value = '';

    carregarAgendamentos();
  });
});

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
