import { describe, expect, it } from 'vitest';
import {
  codigoMentoria,
  cronograma,
  dataCalendario,
  opcional,
  slugDoCodigo,
  urlHttps,
  validarCronograma,
} from './schemas';

const cronogramaValidado = cronograma.superRefine(validarCronograma);

const valido = {
  inscricoes: { abertura: '2026-10-01', fechamento: '2026-10-10' },
  realizacao: { inicio: '2026-10-20', fim: '2026-11-30' },
};

describe('dataCalendario', () => {
  it('aceita string YYYY-MM-DD', () => {
    expect(dataCalendario.parse('2026-04-06')).toBe('2026-04-06');
  });

  it('normaliza o Date gerado pelo YAML sem deslocar o dia', () => {
    expect(dataCalendario.parse(new Date('2026-04-06T00:00:00Z'))).toBe('2026-04-06');
  });

  it.each(['2026-02-30', '06/04/2026', '', 20260406])('rejeita %s', (v) => {
    expect(dataCalendario.safeParse(v).success).toBe(false);
  });
});

describe('cronograma', () => {
  it('aceita datas em ordem, inclusive iguais', () => {
    expect(cronogramaValidado.safeParse(valido).success).toBe(true);
    const iguais = {
      inscricoes: { abertura: '2026-10-01', fechamento: '2026-10-01' },
      realizacao: { inicio: '2026-10-01', fim: '2026-10-01' },
    };
    expect(cronogramaValidado.safeParse(iguais).success).toBe(true);
  });

  it.each([
    ['fechamento antes da abertura', { ...valido, inscricoes: { abertura: '2026-10-10', fechamento: '2026-10-01' } }, 'inscricoes.fechamento'],
    ['início antes do fechamento', { ...valido, realizacao: { inicio: '2026-10-05', fim: '2026-11-30' } }, 'realizacao.inicio'],
    ['fim antes do início', { ...valido, realizacao: { inicio: '2026-10-20', fim: '2026-10-19' } }, 'realizacao.fim'],
  ])('rejeita %s apontando o campo', (_, dados, campo) => {
    const r = cronogramaValidado.safeParse(dados);
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join('.'))).toContain(campo);
  });
});

describe('codigoMentoria e slugDoCodigo', () => {
  it.each(['M1.26A', 'M12.27B'])('aceita %s', (c) => {
    expect(codigoMentoria.safeParse(c).success).toBe(true);
  });

  it.each(['m1.26a', 'M1-26A', 'M1.2026A', 'M1.26'])('rejeita %s', (c) => {
    expect(codigoMentoria.safeParse(c).success).toBe(false);
  });

  it('gera o slug da URL', () => {
    expect(slugDoCodigo('M1.26A')).toBe('m1-26a');
  });
});

describe('opcional e urlHttps', () => {
  const campo = opcional(urlHttps);

  it('trata "" e null do painel como ausente', () => {
    expect(campo.parse('')).toBeUndefined();
    expect(campo.parse(null)).toBeUndefined();
  });

  it('exige https', () => {
    expect(campo.safeParse('http://exemplo.com').success).toBe(false);
    expect(campo.parse('https://exemplo.com')).toBe('https://exemplo.com');
  });
});
