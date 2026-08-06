// Grade fixa de aulas do laboratório (segunda a sexta)
const AULAS = {
  '1': { rotulo: '1ª aula', inicio: '08:00', fim: '08:45' },
  '2': { rotulo: '2ª aula', inicio: '08:45', fim: '09:30' },
  '3': { rotulo: '3ª aula', inicio: '09:30', fim: '10:15' },
  '4': { rotulo: '4ª aula', inicio: '10:30', fim: '11:15' },
  '5': { rotulo: '5ª aula', inicio: '11:15', fim: '12:00' },
  '6': { rotulo: '6ª aula', inicio: '12:00', fim: '12:45' }
};

function rotuloAula(numeroAula) {
  const aula = AULAS[numeroAula];
  return aula ? `${aula.rotulo} (${aula.inicio} - ${aula.fim})` : '';
}

// Monta o timestamp que vai pro banco a partir da data escolhida + horário de início da aula
function montarDataHora(dataStr, numeroAula) {
  const aula = AULAS[numeroAula];
  if (!dataStr || !aula) return null;
  return `${dataStr}T${aula.inicio}:00`;
}

// true se a data (YYYY-MM-DD) cair de segunda a sexta
function ehDiaUtil(dataStr) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const diaSemana = new Date(ano, mes - 1, dia).getDay(); // 0 = domingo, 6 = sábado
  return diaSemana >= 1 && diaSemana <= 5;
}
