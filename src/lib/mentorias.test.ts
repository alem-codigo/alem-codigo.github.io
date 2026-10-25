import { describe, expect, it } from 'vitest';
import { agruparParaHome, formatarData, formatarPeriodo, juntarLista, textoDataStatus } from './mentorias';
import { STATUS_MENTORIA, VARIANTE_CARD, type Cronograma } from './status';

const hoje = '2026-11-05';

const m = (id: string, abertura: string, fechamento: string, inicio: string, fim: string) => ({
  id,
  inscricoes: { abertura, fechamento },
  realizacao: { inicio, fim },
});

describe('formatarData', () => {
  it('omite o ano quando é o mesmo de hoje', () => {
    expect(formatarData('2026-04-06', hoje)).toBe('06/04');
  });

  it('mostra o ano quando é outro', () => {
    expect(formatarData('2027-01-10', hoje)).toBe('10/01/2027');
  });

  it('não sofre deslocamento de fuso (não usa Date)', () => {
    expect(formatarData('2026-01-01', '2026-01-01')).toBe('01/01');
  });
});

describe('formatarPeriodo', () => {
  it('ano só no fim quando pedido', () => {
    expect(formatarPeriodo('2026-04-06', '2026-04-24', hoje, true)).toBe('06/04 – 24/04/2026');
  });

  it('sem ano no mesmo ano de hoje', () => {
    expect(formatarPeriodo('2026-11-10', '2026-12-01', hoje)).toBe('10/11 – 01/12');
  });

  it('virada de ano mostra os dois anos', () => {
    expect(formatarPeriodo('2026-12-10', '2027-01-20', hoje)).toBe('10/12/2026 – 20/01/2027');
  });
});

describe('textoDataStatus', () => {
  const c: Cronograma = m('x', '2026-11-01', '2026-11-10', '2026-11-20', '2026-12-15');

  it.each([
    ['em-breve', 'Inscrições a partir de 01/11'],
    ['inscricoes-abertas', 'Inscrições até 10/11'],
    ['inscricoes-encerradas', 'Começa em 20/11'],
    ['em-andamento', 'Termina em 15/12'],
    ['encerrada', '20/11 – 15/12/2026'],
  ] as const)('%s → %s', (status, esperado) => {
    expect(textoDataStatus(c, status, hoje)).toBe(esperado);
  });

});

describe('agruparParaHome', () => {
  const lista = [
    m('encerrada', '2026-09-01', '2026-09-10', '2026-09-20', '2026-10-30'),
    m('aberta-tarde', '2026-11-01', '2026-11-20', '2026-11-25', '2026-12-20'),
    m('aberta-cedo', '2026-11-01', '2026-11-08', '2026-11-15', '2026-12-10'),
    m('breve-tarde', '2026-12-01', '2026-12-10', '2026-12-15', '2027-01-20'),
    m('breve-cedo', '2026-11-20', '2026-11-30', '2026-12-05', '2026-12-30'),
    m('aguardando', '2026-10-20', '2026-11-01', '2026-11-12', '2026-12-12'),
    m('andamento-longa', '2026-10-01', '2026-10-10', '2026-10-15', '2026-12-30'),
    m('andamento-curta', '2026-10-01', '2026-10-10', '2026-10-15', '2026-11-20'),
  ];
  const g = agruparParaHome(lista, hoje);
  const ids = (xs: { mentoria: { id: string } }[]) => xs.map((x) => x.mentoria.id);

  it('abertas pelo fechamento mais próximo', () => {
    expect(ids(g.abertas)).toEqual(['aberta-cedo', 'aberta-tarde']);
  });

  it('em breve pela abertura mais próxima', () => {
    expect(ids(g.emBreve)).toEqual(['breve-cedo', 'breve-tarde']);
  });

  it('em andamento primeiro (fim mais próximo), depois inscrições encerradas', () => {
    expect(ids(g.emAndamento)).toEqual(['andamento-curta', 'andamento-longa', 'aguardando']);
    expect(g.emAndamento.at(-1)?.status).toBe('inscricoes-encerradas');
  });

  it('encerradas ficam de fora', () => {
    const todos = [...g.abertas, ...g.emBreve, ...g.emAndamento];
    expect(ids(todos)).not.toContain('encerrada');
  });

  it('lista vazia gera blocos vazios', () => {
    expect(agruparParaHome([], hoje)).toEqual({ abertas: [], emBreve: [], emAndamento: [] });
  });
});

describe('VARIANTE_CARD (Q-08)', () => {
  it('cobre todos os status', () => {
    expect(Object.keys(VARIANTE_CARD).sort()).toEqual([...STATUS_MENTORIA].sort());
  });

  it('abertas = violeta, encerrada = grafite, demais = padrão', () => {
    expect(VARIANTE_CARD['inscricoes-abertas']).toBe('violeta');
    expect(VARIANTE_CARD.encerrada).toBe('grafite');
    expect(VARIANTE_CARD['em-breve']).toBe('padrao');
  });
});

describe('juntarLista', () => {
  it.each([
    [[], ''],
    [['ADS'], 'ADS'],
    [['ADS', 'GTI'], 'ADS e GTI'],
    [['A', 'B', 'C'], 'A, B e C'],
  ])('%j → %s', (itens, esperado) => {
    expect(juntarLista(itens)).toBe(esperado);
  });
});
