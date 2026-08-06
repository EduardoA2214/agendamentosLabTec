// Notificações (toast) e confirmação em modal, no lugar de alert()/confirm() nativos do navegador.

function mostrarToast(mensagem, tipo = 'sucesso') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visivel'));

  setTimeout(() => {
    toast.classList.remove('toast-visivel');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

function confirmar(mensagem) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-confirm';

    const texto = document.createElement('p');
    texto.textContent = mensagem;

    const botoes = document.createElement('div');
    botoes.className = 'modal-botoes';

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'secondary';
    btnCancelar.textContent = 'Cancelar';

    const btnConfirmar = document.createElement('button');
    btnConfirmar.type = 'button';
    btnConfirmar.className = 'danger';
    btnConfirmar.textContent = 'Confirmar';

    botoes.appendChild(btnCancelar);
    botoes.appendChild(btnConfirmar);
    modal.appendChild(texto);
    modal.appendChild(botoes);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('modal-visivel'));

    function fechar(resultado) {
      overlay.classList.remove('modal-visivel');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      resolve(resultado);
    }

    btnCancelar.addEventListener('click', () => fechar(false));
    btnConfirmar.addEventListener('click', () => fechar(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fechar(false);
    });
  });
}
