import { describe, expect, it } from 'vitest';
import codigo from './nucleo.js?raw';

// nucleo.js é escrito para o escopo global do Apps Script (sem export). Aqui ele é avaliado
// numa função e as funções públicas são devolvidas num objeto.
const EXPORTAR = [
  'extrairIdYoutube',
  'ehLinkDeReuniao',
  'idDaTurma',
  'listarIdsDasTurmas',
  'idsYoutubeDaTurma',
  'limparTexto',
  'montarConteudo',
  'serializar',
  'conteudoMudou',
  'caminhoDoJson',
  'mensagemDeCommit',
] as const;

type Nucleo = Record<(typeof EXPORTAR)[number], (...args: any[]) => any>;
const n = new Function(`${codigo}\nreturn { ${EXPORTAR.join(', ')} };`)() as Nucleo;

const formatoSP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

/** Equivalente ao Utilities.formatDate(d, FUSO, "yyyy-MM-dd'T'HH:mm:ssXXX") do adaptador. */
function isoSaoPaulo(d: Date): string {
  const p = Object.fromEntries(formatoSP.formatToParts(d).map((x) => [x.type, x.value]));
  const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName!.replace('GMT', '');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offset}`;
}

const PUBLICO = 'dQw4w9WgXcQ';
const NAO_LISTADO = 'abcdefghijk';

function turma() {
  return {
    curso: { id: '869871604122', name: 'M26-05 — Gestão Ágil', enrollmentCode: 'segredo1', calendarId: 'c_x@group.calendar.google.com' },
    topicos: [
      { topicId: 't2', name: 'Semana 1', updateTime: '2026-11-01T10:00:00Z' },
      { topicId: 't1', name: 'Boas-vindas' },
    ],
    atividades: [
      {
        id: 'cw2',
        title: 'Exercício 1',
        description: 'Assista: https://youtu.be/' + NAO_LISTADO + ' e https://www.youtube.com/watch?v=' + PUBLICO + '\r\nAula: https://teams.microsoft.com/l/meetup-join/xyz',
        topicId: 't2',
        creationTime: '2026-11-04T13:00:00.123Z',
        dueDate: { year: 2026, month: 11, day: 12 },
        dueTime: { hours: 2, minutes: 59 },
        state: 'PUBLISHED',
        alternateLink: 'https://classroom.google.com/c/x/a/cw2/details',
        creatorUserId: '123',
        materials: [
          { youtubeVideo: { id: PUBLICO, title: 'Aula 1', alternateLink: 'https://youtu.be/' + PUBLICO } },
          { youtubeVideo: { id: NAO_LISTADO, title: 'Live 1' } },
          { driveFile: { driveFile: { id: 'd1', title: 'Slides', alternateLink: 'https://drive.google.com/file/d/d1' }, shareMode: 'VIEW' } },
          { form: { formUrl: 'https://forms.gle/q', responseUrl: 'https://docs.google.com/r', title: 'Quiz' } },
          { link: { url: 'https://meet.google.com/abc-defg-hij', title: 'Sala' } },
          { link: { url: 'https://www.youtube.com/live/' + NAO_LISTADO + '?si=x', title: 'Gravação' } },
          { link: { url: 'https://developer.mozilla.org/', title: 'MDN' } },
          { gemGem: { id: 'g1' } },
        ],
      },
    ],
    materiais: [
      { id: 'm1', title: 'Boas-vindas', topicId: 't1', creationTime: '2026-11-03T12:00:00Z', scheduledTime: '2026-11-04T09:00:00Z' },
      { id: 'm0', title: 'Sem tópico', topicId: 'apagado', creationTime: '2026-11-03T12:00:00Z' },
    ],
    eventos: [
      {
        titulo: 'Live — Semana 2',
        inicio: new Date('2026-11-12T22:30:00Z'),
        fim: new Date('2026-11-13T00:00:00Z'),
        textos: ['https://streamyard.com/abc', 'Ao vivo: https://youtube.com/live/' + PUBLICO],
      },
      {
        titulo: 'Live — Semana 1',
        inicio: new Date('2026-11-05T22:30:00Z'),
        fim: new Date('2026-11-06T00:00:00Z'),
        textos: ['https://teams.microsoft.com/l/x', 'https://youtu.be/' + NAO_LISTADO],
      },
    ],
  };
}

describe('extrairIdYoutube', () => {
  it.each([
    ['https://www.youtube.com/watch?v=' + PUBLICO, PUBLICO],
    ['https://m.youtube.com/watch?feature=share&v=' + PUBLICO, PUBLICO],
    ['https://youtu.be/' + PUBLICO + '?t=10', PUBLICO],
    ['https://www.youtube.com/live/' + PUBLICO + '?si=abc', PUBLICO],
    ['https://youtube.com/shorts/' + PUBLICO, PUBLICO],
    ['https://www.youtube-nocookie.com/embed/' + PUBLICO, PUBLICO],
  ])('%s', (url, id) => expect(n.extrairIdYoutube(url)).toBe(id));

  it.each([
    'https://www.youtube.com/@alemdocodigo-mentoria',
    'https://www.youtube.com/playlist?list=PL123',
    'https://notyoutube.com/watch?v=' + PUBLICO,
    'https://youtu.be/curto',
  ])('não é vídeo: %s', (url) => expect(n.extrairIdYoutube(url)).toBeNull());
});

describe('ehLinkDeReuniao', () => {
  it('reconhece Meet, Teams, Zoom e StreamYard, inclusive subdomínios', () => {
    expect(n.ehLinkDeReuniao('https://meet.google.com/abc')).toBe(true);
    expect(n.ehLinkDeReuniao('https://teams.microsoft.com/l/meetup-join/x')).toBe(true);
    expect(n.ehLinkDeReuniao('https://us02web.zoom.us/j/1')).toBe(true);
    expect(n.ehLinkDeReuniao('https://streamyard.com/xyz')).toBe(true);
    expect(n.ehLinkDeReuniao('https://notzoom.us/j/1')).toBe(false);
    expect(n.ehLinkDeReuniao('https://drive.google.com/x')).toBe(false);
  });
});

describe('idDaTurma e COURSE_IDS', () => {
  it('aceita o número e o link da turma (mesma conversão do site)', () => {
    expect(n.idDaTurma('869871604122')).toBe('869871604122');
    expect(n.idDaTurma('https://classroom.google.com/c/ODY5ODcxNjA0MTIy')).toBe('869871604122');
    expect(n.idDaTurma('https://classroom.google.com/u/1/c/ODY5ODcxNjA0MTIy?cjc=x')).toBe('869871604122');
    expect(n.idDaTurma('não é turma')).toBeNull();
  });

  it('separa por vírgula, espaço ou linha, sem repetir, e acusa valor inválido', () => {
    expect(n.listarIdsDasTurmas('1, 2\n3 ;2')).toEqual(['1', '2', '3']);
    expect(n.listarIdsDasTurmas('')).toEqual([]);
    expect(() => n.listarIdsDasTurmas('1, abc!')).toThrow(/abc!/);
  });
});

describe('idsYoutubeDaTurma', () => {
  it('junta IDs de anexos, links, descrições e eventos, sem repetir', () => {
    expect(n.idsYoutubeDaTurma(turma()).sort()).toEqual([NAO_LISTADO, PUBLICO].sort());
  });
});

describe('montarConteudo', () => {
  const c = n.montarConteudo(turma(), [PUBLICO], isoSaoPaulo);
  const json = JSON.stringify(c);

  it('segue a lista branca: nada fora do contrato 6.6', () => {
    expect(Object.keys(c)).toEqual(['courseId', 'nome', 'topicos', 'itens', 'eventos']);
    for (const item of c.itens) {
      expect(Object.keys(item)).toEqual(['id', 'tipo', 'titulo', 'descricao', 'topicoId', 'publicadoEm', 'prazo', 'anexos']);
    }
    for (const proibido of ['segredo1', 'enrollmentCode', 'calendarId', 'creatorUserId', 'alternateLink', 'shareMode', 'responseUrl', 'gemGem']) {
      expect(json).not.toContain(proibido);
    }
  });

  it('nunca publica ID ou link de vídeo não público (D-13)', () => {
    expect(json).not.toContain(NAO_LISTADO);
    const anexos = c.itens.find((i: any) => i.id === 'cw2').anexos;
    expect(anexos[0]).toEqual({ tipo: 'youtube', titulo: 'Aula 1', youtubeId: PUBLICO });
    expect(anexos[1]).toEqual({ tipo: 'youtube', titulo: 'Live 1', youtubeId: null });
    expect(anexos[5]).toEqual({ tipo: 'youtube', titulo: 'Gravação', youtubeId: null });
  });

  it('sem consulta ao YouTube (lista vazia), nenhum vídeo é publicado', () => {
    const semConsulta = JSON.stringify(n.montarConteudo(turma(), [], isoSaoPaulo));
    expect(semConsulta).not.toContain(PUBLICO);
    expect(semConsulta).not.toContain(NAO_LISTADO);
  });

  it('nunca publica links de reunião, nem em anexos nem em descrições', () => {
    expect(json).not.toMatch(/teams\.microsoft|meet\.google|streamyard/);
    const item = c.itens.find((i: any) => i.id === 'cw2');
    expect(item.anexos).toContainEqual({ tipo: 'link', titulo: 'Link da aula', url: null });
    expect(item.descricao).toBe(
      'Assista: (vídeo disponível no Classroom) e https://www.youtube.com/watch?v=' + PUBLICO + '\nAula: (link disponível no Classroom)',
    );
  });

  it('mantém Drive, Forms e links comuns e descarta tipos desconhecidos', () => {
    const anexos = c.itens.find((i: any) => i.id === 'cw2').anexos;
    expect(anexos).toHaveLength(7);
    expect(anexos[2]).toEqual({ tipo: 'drive', titulo: 'Slides', url: 'https://drive.google.com/file/d/d1' });
    expect(anexos[3]).toEqual({ tipo: 'form', titulo: 'Quiz', url: 'https://forms.gle/q' });
    expect(anexos[6]).toEqual({ tipo: 'link', titulo: 'MDN', url: 'https://developer.mozilla.org/' });
  });

  it('converte datas para São Paulo; prazo vem em UTC da API', () => {
    const cw2 = c.itens.find((i: any) => i.id === 'cw2');
    expect(cw2.publicadoEm).toBe('2026-11-04T10:00:00-03:00');
    // 12/11 02:59 UTC = 11/11 23:59 em São Paulo
    expect(cw2.prazo).toBe('2026-11-11T23:59:00-03:00');
    const m1 = c.itens.find((i: any) => i.id === 'm1');
    expect(m1.publicadoEm).toBe('2026-11-04T06:00:00-03:00'); // scheduledTime tem prioridade
    expect(m1.prazo).toBeNull();
  });

  it('tópicos na ordem da API; item com tópico inexistente fica sem tópico', () => {
    expect(c.topicos).toEqual([
      { id: 't2', nome: 'Semana 1', ordem: 0 },
      { id: 't1', nome: 'Boas-vindas', ordem: 1 },
    ]);
    expect(c.itens.find((i: any) => i.id === 'm0').topicoId).toBeNull();
  });

  it('ordena itens por publicação e eventos por início; só link público vai no evento', () => {
    expect(c.itens.map((i: any) => i.id)).toEqual(['m0', 'm1', 'cw2']);
    expect(c.eventos).toEqual([
      { titulo: 'Live — Semana 1', inicio: '2026-11-05T19:30:00-03:00', fim: '2026-11-05T21:00:00-03:00', url: null },
      {
        titulo: 'Live — Semana 2',
        inicio: '2026-11-12T19:30:00-03:00',
        fim: '2026-11-12T21:00:00-03:00',
        url: 'https://www.youtube.com/watch?v=' + PUBLICO,
      },
    ]);
  });

  it('é determinístico: a ordem de chegada da API não muda o resultado', () => {
    const t = turma();
    t.materiais.reverse();
    t.eventos.reverse();
    expect(n.montarConteudo(t, [PUBLICO], isoSaoPaulo)).toEqual(c);
  });
});

describe('serializar e conteudoMudou', () => {
  const c = n.montarConteudo(turma(), [PUBLICO], isoSaoPaulo);

  it('geradoEm primeiro, indentação de 2 espaços e quebra de linha final', () => {
    const texto = n.serializar(c, '2026-11-04T10:00:00-03:00');
    expect(texto.startsWith('{\n  "geradoEm": "2026-11-04T10:00:00-03:00",\n  "courseId"')).toBe(true);
    expect(texto.endsWith('}\n')).toBe(true);
  });

  it('ignora geradoEm: só há commit quando o conteúdo muda', () => {
    const noRepo = n.serializar(c, '2026-11-01T00:00:00-03:00');
    expect(n.conteudoMudou(noRepo, c)).toBe(false);
    expect(n.conteudoMudou(null, c)).toBe(true);
    expect(n.conteudoMudou('{ quebrado', c)).toBe(true);
    const outro = n.montarConteudo({ ...turma(), eventos: [] }, [PUBLICO], isoSaoPaulo);
    expect(n.conteudoMudou(noRepo, outro)).toBe(true);
  });

  it('caminho e mensagem de commit sem dados pessoais', () => {
    expect(n.caminhoDoJson('869871604122')).toBe('src/data/classroom/869871604122.json');
    expect(n.mensagemDeCommit(c)).toBe('Classroom: atualiza M26-05 — Gestão Ágil (869871604122)');
  });
});
