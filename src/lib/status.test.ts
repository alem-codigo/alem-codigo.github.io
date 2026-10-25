import { describe, expect, it } from 'vitest';
import { hojeEmSaoPaulo } from './datas';
import { calcularStatus, STATUS_COM_PILULA, temPilula, type Cronograma } from './status';

const m: Cronograma = {
  inscricoes: { abertura: '2026-10-01', fechamento: '2026-10-10' },
  realizacao: { inicio: '2026-10-20', fim: '2026-11-30' },
};

describe('calcularStatus', () => {
  it.each([
    ['2026-09-30', 'em-breve'],
    ['2026-10-01', 'inscricoes-abertas'],
    ['2026-10-10', 'inscricoes-abertas'],
    ['2026-10-11', 'inscricoes-encerradas'],
    ['2026-10-19', 'inscricoes-encerradas'],
    ['2026-10-20', 'em-andamento'],
    ['2026-11-30', 'em-andamento'],
    ['2026-12-01', 'encerrada'],
  ] as const)('%s → %s', (hoje, esperado) => {
    expect(calcularStatus(m, hoje)).toBe(esperado);
  });

  it('com fechamento no mesmo dia do início, vale inscricoes-abertas nesse dia', () => {
    const c: Cronograma = {
      inscricoes: { abertura: '2026-10-01', fechamento: '2026-10-20' },
      realizacao: { inicio: '2026-10-20', fim: '2026-10-30' },
    };
    expect(calcularStatus(c, '2026-10-20')).toBe('inscricoes-abertas');
    expect(calcularStatus(c, '2026-10-21')).toBe('em-andamento');
  });

  it('mentoria de um dia só', () => {
    const c: Cronograma = {
      inscricoes: { abertura: '2026-10-01', fechamento: '2026-10-01' },
      realizacao: { inicio: '2026-10-01', fim: '2026-10-01' },
    };
    expect(calcularStatus(c, '2026-10-01')).toBe('inscricoes-abertas');
    expect(calcularStatus(c, '2026-10-02')).toBe('encerrada');
  });

  it('rejeita "hoje" fora do formato', () => {
    expect(() => calcularStatus(m, '10/10/2026')).toThrow(RangeError);
  });

  describe('virada de dia em São Paulo (D-14)', () => {
    const status = (instanteUtc: string) => calcularStatus(m, hojeEmSaoPaulo(new Date(instanteUtc)));

    it('23:59 do último dia de inscrição em SP: ainda aberta', () => {
      expect(status('2026-10-11T02:59:00Z')).toBe('inscricoes-abertas');
    });

    it('build das 02:00 em SP (05:00 UTC) do dia seguinte: inscrições fechadas', () => {
      expect(status('2026-10-11T05:00:00Z')).toBe('inscricoes-encerradas');
    });

    it('um build às 22:00 em SP (01:00 UTC do dia seguinte) não fecha antes da hora', () => {
      expect(status('2026-10-11T01:00:00Z')).toBe('inscricoes-abertas');
    });
  });
});

describe('pílulas', () => {
  it('a encerrada não tem pílula; os demais status têm', () => {
    expect(temPilula('encerrada')).toBe(false);
    expect(STATUS_COM_PILULA).toEqual(['em-breve', 'inscricoes-abertas', 'inscricoes-encerradas', 'em-andamento']);
  });
});
