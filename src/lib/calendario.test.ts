import { describe, expect, it } from 'vitest';
import { diaSeguinte, eventoCalendario, gerarIcs, linksCalendario } from './calendario';

const m = {
  titulo: 'Análise de Dados, com Qlik',
  inscricoes: { abertura: '2026-12-01', fechamento: '2026-12-31' },
  realizacao: { inicio: '2027-01-11', fim: '2027-01-29' },
};
const url = 'https://alem-codigo.github.io/mentorias/m27-01/';

describe('eventoCalendario', () => {
  it('em breve e abertas: último dia de inscrição', () => {
    for (const s of ['em-breve', 'inscricoes-abertas'] as const) {
      expect(eventoCalendario(m, s, 'm27-01', url)).toMatchObject({ inicio: '2026-12-31', fim: '2026-12-31' });
    }
  });

  it('encerradas e em andamento: período da mentoria', () => {
    for (const s of ['inscricoes-encerradas', 'em-andamento'] as const) {
      expect(eventoCalendario(m, s, 'm27-01', url)).toMatchObject({ inicio: '2027-01-11', fim: '2027-01-29' });
    }
  });

  it('encerrada: sem evento', () => {
    expect(eventoCalendario(m, 'encerrada', 'm27-01', url)).toBeNull();
  });
});

describe('diaSeguinte', () => {
  it.each([
    ['2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29'],
    ['2026-10-25', '2026-10-26'],
  ])('%s → %s', (d, esperado) => expect(diaSeguinte(d)).toBe(esperado));
});

describe('linksCalendario', () => {
  const e = eventoCalendario(m, 'em-andamento', 'm27-01', url)!;
  const l = linksCalendario(e);

  it('Google com fim exclusivo', () => {
    expect(new URL(l.google).searchParams.get('dates')).toBe('20270111/20270130');
  });

  it('Outlook pessoal e empresa, dia inteiro', () => {
    expect(new URL(l.outlookPessoal).host).toBe('outlook.live.com');
    expect(new URL(l.outlookEmpresa).host).toBe('outlook.office.com');
    expect(new URL(l.outlookEmpresa).searchParams.get('enddt')).toBe('2027-01-30');
    expect(new URL(l.outlookPessoal).searchParams.get('allday')).toBe('true');
  });
});

describe('gerarIcs', () => {
  const ics = gerarIcs(eventoCalendario(m, 'inscricoes-abertas', 'm27-01', url)!, new Date('2026-10-26T12:00:00Z'));

  it('evento de dia inteiro, com CRLF e escape de vírgula', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('DTSTAMP:20261026T120000Z');
    expect(ics).toContain('Análise de Dados\\, com Qlik');
  });

  it('nenhuma linha passa de 75 octetos', () => {
    for (const linha of ics.split('\r\n')) expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
  });
});
