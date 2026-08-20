// Só deixa continuar se houver sessão de professor; senão volta pro login
exigirPapel('professor', '../index.html');

configurarLogout('btn-logout', '../index.html');
configurarNavegacao('btn-sala-informatica', 'professor.html');
configurarNavegacao('btn-sala-video', 'professor-video.html');
