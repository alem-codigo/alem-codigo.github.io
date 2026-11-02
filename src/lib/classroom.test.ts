import { describe, expect, it, vi } from 'vitest';
import exemploApi from './fixtures/turma-api-exemplo.json';
import m2601Api from './fixtures/turma-api-m26-01.json';
import m2605Api from './fixtures/turma-api-m26-05.json';
import {
  cronogramaPorTopico,
  dataDaLive,
  ehLive,
  formatarDataHora,
  horarioDaLive,
  instanteEmSaoPaulo,
  linhasDaDescricao,
  linkDaTurma,
  mostrarPortal,
  proximasLives,
  proximosPrazos,
  urlSegura,
} from './classroom';
import { buscarTurma, ErroTurma, montarConteudo, type TurmaApi } from './classroomApi';
import { idDoLinkDaTurma } from './schemas';

const exemplo = montarConteudo(exemploApi as TurmaApi, '797247136963', linkDaTurma('797247136963'));
const m2605 = montarConteudo(m2605Api as TurmaApi, '869871604122', linkDaTurma('869871604122'));
const item = (id: string) => exemplo.itens.find((i) => i.id === id)!;

describe('conversão da resposta da API', () => {
  it('turma real da M26-05: um material sem tópico, com os dois PDFs do Drive', () => {
    expect(m2605).toMatchObject({ courseId: '869871604122', topicos: [], link: 'https://classroom.google.com/c/ODY5ODcxNjA0MTIy' });
    expect(m2605.itens).toHaveLength(1);
    expect(m2605.itens[0]).toMatchObject({ tipo: 'material', topicoId: null, prazo: null, publicadoEm: '2026-10-25T18:39:39.501Z' });
    expect(m2605.itens[0]!.anexos.map((a) => a.tipo)).toEqual(['drive', 'drive']);
  });

  it('descarta rascunhos e tipos de anexo desconhecidos; link do YouTube vira vídeo', () => {
    expect(exemplo.itens.map((i) => i.id)).not.toContain('cm-rascunho');
    expect(item('cm-aula-1').anexos).toEqual([
      { tipo: 'youtube', titulo: 'Scrum em 10 minutos', youtubeId: 'dQw4w9WgXcQ' },
      { tipo: 'youtube', titulo: 'Gravação da live (não listada)', youtubeId: 'aqz-KE-bpKQ' },
      { tipo: 'drive', titulo: 'Slides da aula 1', url: 'https://docs.google.com/presentation/d/xyz/edit' },
    ]);
  });

  it('prazo em UTC da API vira o instante certo (23:59 em São Paulo)', () => {
    expect(item('cw-exercicio-1').prazo).toBe('2026-11-13T02:59:00.000Z');
    expect(formatarDataHora(item('cw-exercicio-1').prazo!, '2026-11-02')).toBe('qui., 12/11, 23:59');
    expect(item('cw-sem-prazo').prazo).toBeNull();
  });

  it('normaliza quebras de linha, troca http por https e descarta outros protocolos', () => {
    expect(item('cm-boas-vindas').descricao).toBe('Olá, turma!\nLeiam o guia em https://scrumguides.org/scrum-guide.html antes da primeira live.');
    const api = structuredClone(exemploApi) as TurmaApi;
    api.materiais[0]!.materials = [{ link: { url: 'javascript:alert(1)', title: 'x' } }, { link: { url: 'http://sala.exemplo.com/abc' } }];
    expect(montarConteudo(api, '1', 'https://classroom.google.com/c/MQ').itens.find((i) => i.id === 'cm-boas-vindas')!.anexos).toEqual([
      { tipo: 'link', titulo: 'sala.exemplo.com/abc', url: 'https://sala.exemplo.com/abc' },
    ]);
    expect(urlSegura('javascript:alert(1)')).toBeNull();
    expect(urlSegura('http://exemplo.com')).toBeNull();
  });

  it('tópico que não veio na lista vira "sem tópico"', () => {
    const api = structuredClone(exemploApi) as TurmaApi;
    api.atividades[0]!.topicId = 'nao-existe';
    expect(montarConteudo(api, '1', '').itens.find((i) => i.id === 'cw-exercicio-1')!.topicoId).toBeNull();
  });
});

describe('chamadas à API', () => {
  const resposta = (status: number, corpo: unknown = {}) => new Response(JSON.stringify(corpo), { status });

  it('busca curso, tópicos, atividades e materiais com o token, seguindo a paginação', async () => {
    const buscar = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/797247136963')) return resposta(200, exemploApi.curso);
      if (u.includes('/topics')) return resposta(200, { topic: exemploApi.topicos });
      if (u.includes('/courseWork?')) return resposta(200, { courseWork: exemploApi.atividades });
      if (u.includes('pageToken=p2')) return resposta(200, { courseWorkMaterial: exemploApi.materiais.slice(3) });
      return resposta(200, { courseWorkMaterial: exemploApi.materiais.slice(0, 3), nextPageToken: 'p2' });
    });
    const turma = await buscarTurma('797247136963', 'tok', buscar as typeof fetch);
    expect(turma.materiais).toHaveLength(exemploApi.materiais.length);
    expect(buscar.mock.calls.every(([, init]) => JSON.stringify(init?.headers).includes('Bearer tok'))).toBe(true);
  });

  it('403/404 = conta sem acesso; 401 = sessão expirada; sem rede = rede', async () => {
    const com = (status: number) => (async () => resposta(status)) as unknown as typeof fetch;
    await expect(buscarTurma('1', 't', com(403))).rejects.toMatchObject({ motivo: 'sem-acesso' });
    await expect(buscarTurma('1', 't', com(404))).rejects.toMatchObject({ motivo: 'sem-acesso' });
    await expect(buscarTurma('1', 't', com(401))).rejects.toMatchObject({ motivo: 'sessao' });
    await expect(buscarTurma('1', 't', com(500))).rejects.toMatchObject({ motivo: 'api' });
    const semRede = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(buscarTurma('1', 't', semRede)).rejects.toBeInstanceOf(ErroTurma);
    await expect(buscarTurma('abc', 't', com(200))).rejects.toMatchObject({ motivo: 'api' });
  });
});

describe('cronograma por tópico', () => {
  it('turma sem tópicos (M26-05): um grupo sem nome', () => {
    const grupos = cronogramaPorTopico(m2605);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ id: null, nome: null });
  });

  it('itens sem tópico em "Geral" no início, tópicos na ordem da API, sem tópicos vazios', () => {
    const grupos = cronogramaPorTopico(exemplo);
    expect(grupos.map((g) => g.nome)).toEqual(['Geral', 'Semana 1 · Fundamentos', 'Semana 2 · Prática']);
    expect(grupos[1]!.itens.map((i) => i.id)).toEqual(['cm-live-abertura', 'cm-aula-1', 'cw-exercicio-1']);
  });

  it('turma vazia: nenhum grupo', () => {
    expect(cronogramaPorTopico({ topicos: [], itens: [] })).toEqual([]);
  });
});

describe('lives a partir dos materiais', () => {
  it('lê data e hora do título em vários formatos, no fuso de São Paulo', () => {
    const pub = '2026-11-03T12:00:00.000Z';
    expect(dataDaLive('Live 04/11 19h30 · Abertura', pub)?.toISOString()).toBe('2026-11-04T22:30:00.000Z');
    expect(dataDaLive('Live 11/11 às 19:30 — Sprint', pub)?.toISOString()).toBe('2026-11-11T22:30:00.000Z');
    expect(dataDaLive('Live 18/11 19h · Retro', pub)?.toISOString()).toBe('2026-11-18T22:00:00.000Z');
    expect(dataDaLive('Live 05/01/2027 20h', pub)?.toISOString()).toBe('2027-01-05T23:00:00.000Z');
    expect(dataDaLive('Live extra (data a confirmar)', pub)).toBeNull();
    expect(dataDaLive('Live 31/02 19h', pub)).toBeNull();
  });

  it('publicada em dezembro para janeiro: ano seguinte', () => {
    expect(dataDaLive('Live 12/01 19h', '2026-12-10T12:00:00.000Z')?.toISOString()).toBe('2027-01-12T22:00:00.000Z');
  });

  it('próximas lives: só as que não terminaram, com o link e o tipo do link', () => {
    const lives = proximasLives(exemplo.itens, new Date('2026-11-04T21:00:00-03:00'));
    expect(lives.map((l) => [l.titulo, l.tipoLink])).toEqual([
      ['Live 04/11 19h30 · Abertura', 'sala'],
      ['Live 11/11 às 19:30 — Sprint planning na prática', 'youtube'],
      ['Live 18/11 19h · Retrospectiva', 'sala'],
    ]);
    expect(lives[1]!.url).toBe('https://www.youtube.com/live/aqz-KE-bpKQ');
    // Duas horas depois do início, a live sai da lista.
    expect(proximasLives(exemplo.itens, new Date('2026-11-04T21:31:00-03:00')).map((l) => l.itemId)).toEqual([
      'cm-live-sprint',
      'cm-live-retro',
    ]);
    expect(proximasLives(m2605.itens, new Date('2026-11-02T13:00:00-03:00'))).toEqual([]);
  });

  it('horário da live em São Paulo, com "Hoje" no próprio dia', () => {
    expect(horarioDaLive('2026-11-11T22:30:00.000Z', '2026-11-02')).toMatchObject({ quando: 'Quarta-feira', hora: '19:30', dia: '2026-11-11' });
    expect(horarioDaLive('2026-11-11T22:30:00.000Z', '2026-11-11').quando).toBe('Hoje');
    expect(instanteEmSaoPaulo(2026, 11, 11, 19, 30).toISOString()).toBe('2026-11-11T22:30:00.000Z');
  });
});

describe('prazos e outros', () => {
  it('próximos prazos: só os por vencer, do mais próximo ao mais distante', () => {
    expect(proximosPrazos(exemplo.itens, new Date('2026-11-10T00:00:00-03:00')).map((i) => i.id)).toEqual(['cw-exercicio-1', 'cw-desafio']);
    expect(proximosPrazos(exemplo.itens, new Date('2026-11-13T00:00:00-03:00')).map((i) => i.id)).toEqual(['cw-desafio']);
    expect(proximosPrazos(m2605.itens, new Date('2026-11-02T13:00:00-03:00'))).toEqual([]);
  });

  it('link da turma é o inverso de idDoLinkDaTurma', () => {
    expect(linkDaTurma('869871604122')).toBe('https://classroom.google.com/c/ODY5ODcxNjA0MTIy');
    expect(idDoLinkDaTurma(linkDaTurma('797247136963'))).toBe('797247136963');
  });

  it('acesso à turma só nas inscrições encerradas, em andamento e encerrada', () => {
    expect(mostrarPortal('em-breve')).toBe(false);
    expect(mostrarPortal('inscricoes-abertas')).toBe(false);
    expect(mostrarPortal('inscricoes-encerradas')).toBe(true);
    expect(mostrarPortal('em-andamento')).toBe(true);
    expect(mostrarPortal('encerrada')).toBe(true);
  });

  it('descrição: linhas sem as vazias e links clicáveis (http vira https), sem a pontuação final', () => {
    expect(linhasDaDescricao('Leia https://exemplo.com/guia.\n\n  \nhttp://meet.google.com/abc fim')).toEqual([
      [{ texto: 'Leia ' }, { url: 'https://exemplo.com/guia' }, { texto: '.' }],
      [{ url: 'https://meet.google.com/abc' }, { texto: ' fim' }],
    ]);
  });
});

describe('turma real da M26-01 (conta de professor, encerrada)', () => {
  const m2601 = montarConteudo(m2601Api as TurmaApi, '793640305776', linkDaTurma('793640305776'));
  const doItem = (id: string) => m2601.itens.find((i) => i.id === id)!;

  it('tópicos na ordem do Classroom e turma ativa (não arquivada)', () => {
    expect(m2601.arquivada).toBe(false);
    expect(cronogramaPorTopico(m2601).map((g) => g.nome)).toEqual(['Seção de Dúvidas', 'Semana 1', 'Semana 2', 'Semana 3']);
  });

  it('link automático do Meet (http) vira https e alimenta a live', () => {
    expect(doItem('797213828089').anexos).toEqual([
      { tipo: 'link', titulo: 'Class video meeting', url: 'https://meet.google.com/aaa-bbbb-ccc' },
    ]);
    const lives = proximasLives(m2601.itens, new Date('2026-04-22T18:00:00-03:00'));
    expect(lives).toEqual([
      expect.objectContaining({ itemId: '797213828089', inicio: '2026-04-22T22:30:00.000Z', url: 'https://meet.google.com/aaa-bbbb-ccc', tipoLink: 'sala' }),
    ]);
  });

  it('"Live" no meio do título conta; gravações não', () => {
    expect(ehLive({ titulo: 'Última Live - dia 22/04 às 19:30 (Horário de Brasília)' })).toBe(true);
    expect(ehLive({ titulo: 'Live 04/11 19h30 · Abertura' })).toBe(true);
    expect(ehLive({ titulo: 'Aula ao vivo 05/11 20h' })).toBe(true);
    expect(ehLive({ titulo: 'Gravação 2ª Live - dia 13/04 às 19:30' })).toBe(false);
    expect(ehLive({ titulo: 'Live 09/04 (gravação)' })).toBe(false);
    expect(ehLive({ titulo: 'Deliverable' })).toBe(false);
    // Antes da live de 13/04, a gravação (com data no título) não aparece em "Próximas lives".
    expect(proximasLives(m2601.itens, new Date('2026-04-12T12:00:00-03:00')).map((l) => l.itemId)).toEqual(['797213828089']);
  });

  it('formulário colado como link vira anexo de formulário, mesmo sem título', () => {
    expect(doItem('797083665808').anexos).toEqual([{ tipo: 'form', titulo: 'Formulário', url: 'https://forms.gle/ficticio123' }]);
  });

  it('prazo de 25/04 02:59 UTC é 24/04 às 23:59 em São Paulo', () => {
    expect(formatarDataHora(doItem('797191058340').prazo!, '2026-11-02')).toBe('sex., 24/04, 23:59');
  });

  it('turma arquivada é marcada', () => {
    const api = structuredClone(m2601Api) as TurmaApi;
    api.curso.courseState = 'ARCHIVED';
    expect(montarConteudo(api, '793640305776', '').arquivada).toBe(true);
  });
});
