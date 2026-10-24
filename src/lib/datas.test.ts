import { describe, expect, it } from 'vitest';
import { ehDataCalendario, hojeEmSaoPaulo, normalizarDataCalendario } from './datas';

describe('hojeEmSaoPaulo', () => {
  it('ainda é o dia anterior às 23:59 de São Paulo (02:59 UTC)', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-11T02:59:59Z'))).toBe('2026-10-10');
  });

  it('vira o dia à meia-noite de São Paulo (03:00 UTC)', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-11T03:00:00Z'))).toBe('2026-10-11');
  });

  it('no horário do build diário (05:00 UTC) já é o dia seguinte ao fechamento', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-11T05:00:00Z'))).toBe('2026-10-11');
  });

  it('vira o ano corretamente', () => {
    expect(hojeEmSaoPaulo(new Date('2027-01-01T02:59:59Z'))).toBe('2026-12-31');
    expect(hojeEmSaoPaulo(new Date('2027-01-01T03:00:00Z'))).toBe('2027-01-01');
  });
});

describe('ehDataCalendario', () => {
  it.each(['2026-04-06', '2028-02-29', '2026-12-31'])('aceita %s', (d) => {
    expect(ehDataCalendario(d)).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-4-6', '06/04/2026', '2026-04-06T00:00'])(
    'rejeita %s',
    (d) => {
      expect(ehDataCalendario(d)).toBe(false);
    },
  );
});

describe('normalizarDataCalendario', () => {
  it('converte o Date que o YAML gera para o mesmo dia escrito no arquivo', () => {
    // YAML: `abertura: 2026-04-06` → meia-noite UTC (21:00 de 05/04 em São Paulo).
    expect(normalizarDataCalendario(new Date('2026-04-06T00:00:00Z'))).toBe('2026-04-06');
  });

  it('mantém strings e valores que não são Date', () => {
    expect(normalizarDataCalendario('2026-04-06')).toBe('2026-04-06');
    expect(normalizarDataCalendario(undefined)).toBeUndefined();
  });

  it('não converte Date inválido', () => {
    const invalida = new Date('x');
    expect(normalizarDataCalendario(invalida)).toBe(invalida);
  });
});
