const escolhaPapel = document.getElementById('escolha-papel');
const btnEscolhaProfessor = document.getElementById('btn-escolha-professor');
const btnEscolhaAdmin = document.getElementById('btn-escolha-admin');

const form = document.getElementById('form-login');
const btnVoltar = document.getElementById('btn-voltar');
const btnSubmit = document.getElementById('btn-login');
const erroMsg = document.getElementById('erro-login');
const campoSenha = document.getElementById('password');
const btnMostrarSenha = document.getElementById('btn-mostrar-senha');

const DESTINO_POR_PAPEL = {
  administrador: 'pages/admin.html',
  professor: 'pages/escolha-sala.html'
};

// Se já existe uma sessão nesta aba, pula direto para a página do papel
(function redirecionarSeJaLogado() {
  const sessao = obterSessao();
  if (sessao && DESTINO_POR_PAPEL[sessao.role]) {
    window.location.href = DESTINO_POR_PAPEL[sessao.role];
  }
})();

// --- Professor: sem senha, entra direto ---
btnEscolhaProfessor.addEventListener('click', async () => {
  btnEscolhaProfessor.disabled = true;
  btnEscolhaProfessor.innerText = 'Entrando...';

  try {
    // Cria uma sessão de professor no banco (sem exigir credencial) — o
    // token continua sendo obrigatório pra criar/consultar agendamento.
    const { data, error } = await supabaseClient.rpc('sessao_professor');

    if (error) throw error;

    const resultado = Array.isArray(data) ? data[0] : data;

    if (!resultado || !resultado.token) {
      throw new Error('Não foi possível iniciar a sessão.');
    }

    salvarSessao('professor', 'professor', resultado.token);
    window.location.href = DESTINO_POR_PAPEL.professor;

  } catch (err) {
    alert('Erro ao entrar: ' + err.message);
    console.error('Erro detalhado:', err);
    btnEscolhaProfessor.disabled = false;
    btnEscolhaProfessor.innerText = 'Sou Professor';
  }
});

// --- Administrador: mostra o formulário de usuário/senha de sempre ---
btnEscolhaAdmin.addEventListener('click', () => {
  escolhaPapel.classList.add('escondido');
  form.classList.remove('escondido');
  document.getElementById('username').setAttribute('required', 'required');
  campoSenha.setAttribute('required', 'required');
  document.getElementById('username').focus();
});

btnVoltar.addEventListener('click', () => {
  form.classList.add('escondido');
  escolhaPapel.classList.remove('escondido');
  document.getElementById('username').removeAttribute('required');
  campoSenha.removeAttribute('required');
  erroMsg.textContent = '';
  form.reset();
});

btnMostrarSenha.addEventListener('click', () => {
  const visivel = campoSenha.type === 'text';
  campoSenha.type = visivel ? 'password' : 'text';
  btnMostrarSenha.textContent = visivel ? '👁' : '🙈';
  btnMostrarSenha.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroMsg.textContent = '';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Entrando...';

  const username = document.getElementById('username').value.trim();
  const password = campoSenha.value;

  try {
    // A verificação da senha acontece dentro do banco (função login_usuario);
    // o front-end nunca recebe hash nem senha, só o resultado.
    const { data, error } = await supabaseClient.rpc('login_usuario', {
      p_username: username,
      p_password: password
    });

    if (error) throw error;

    const resultado = Array.isArray(data) ? data[0] : data;

    if (!resultado || !resultado.ok || !DESTINO_POR_PAPEL[resultado.role]) {
      erroMsg.textContent = 'Usuário ou senha inválidos.';
      return;
    }

    salvarSessao(username, resultado.role, resultado.token);
    window.location.href = DESTINO_POR_PAPEL[resultado.role];

  } catch (err) {
    erroMsg.textContent = 'Erro ao entrar: ' + err.message;
    console.error('Erro detalhado:', err);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Entrar';
  }
});
