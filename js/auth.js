// Controle de sessão da aba atual. O token é emitido pela função login_usuario
// no banco e é exigido por toda função sensível (criar/excluir/listar
// agendamento) — sem ele, a API recusa a ação, mesmo com a chave anon.
const SESSION_KEY = 'agendamentos_sessao';

function salvarSessao(username, role, token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username, role, token }));
}

function obterSessao() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function encerrarSessao() {
  sessionStorage.removeItem(SESSION_KEY);
}

// Garante que só o papel esperado acesse a página; senão, volta para o login.
function exigirPapel(roleEsperado, caminhoLogin) {
  const sessao = obterSessao();
  if (!sessao || sessao.role !== roleEsperado || !sessao.token) {
    window.location.href = caminhoLogin;
    return null;
  }
  return sessao;
}

function configurarNavegacao(botaoId, destino) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = destino;
  });
}

function configurarLogout(botaoId, caminhoLogin) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const sessao = obterSessao();
    if (sessao && sessao.token) {
      try {
        await supabaseClient.rpc('logout_usuario', { p_token: sessao.token });
      } catch (err) {
        console.error('Erro ao encerrar sessão no servidor:', err);
      }
    }
    encerrarSessao();
    window.location.href = caminhoLogin;
  });
}
