const form = document.getElementById('form-login');
const btnSubmit = document.getElementById('btn-login');
const erroMsg = document.getElementById('erro-login');
const campoSenha = document.getElementById('password');
const btnMostrarSenha = document.getElementById('btn-mostrar-senha');

btnMostrarSenha.addEventListener('click', () => {
  const visivel = campoSenha.type === 'text';
  campoSenha.type = visivel ? 'password' : 'text';
  btnMostrarSenha.textContent = visivel ? '👁' : '🙈';
  btnMostrarSenha.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
});

const DESTINO_POR_PAPEL = {
  administrador: 'pages/admin.html',
  professor: 'pages/professor.html'
};

// Se já existe uma sessão nesta aba, pula direto para a página do papel
(function redirecionarSeJaLogado() {
  const sessao = obterSessao();
  if (sessao && DESTINO_POR_PAPEL[sessao.role]) {
    window.location.href = DESTINO_POR_PAPEL[sessao.role];
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroMsg.textContent = '';
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Entrando...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

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
