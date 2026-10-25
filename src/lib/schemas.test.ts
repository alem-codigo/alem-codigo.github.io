import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import {
  codigoMentoria,
  codigosDuplicados,
  cronograma,
  dataCalendario,
  idDeReferencia,
  opcional,
  slugDoCodigo,
  urlHttps,
  validarCodigo,
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
  it.each(['M26-01', 'M27-12', 'M26-99'])('aceita %s', (c) => {
    expect(codigoMentoria.safeParse(c).success).toBe(true);
  });

  it.each(['m26-01', 'M26-1', 'M2026-01', 'M26-00', 'M26.01', 'M1.26A', 'M26-001'])('rejeita %s', (c) => {
    expect(codigoMentoria.safeParse(c).success).toBe(false);
  });

  it('gera o slug da URL', () => {
    expect(slugDoCodigo('M26-01')).toBe('m26-01');
  });
});

describe('validarCodigo', () => {
  const comCodigo = (codigo: string, inicio: string) =>
    z.object({ codigo: z.string(), realizacao: z.object({ inicio: z.string() }) }).superRefine(validarCodigo).safeParse({
      codigo,
      realizacao: { inicio },
    });

  it('aceita o ano do início da realização', () => {
    expect(comCodigo('M27-01', '2027-02-01').success).toBe(true);
  });

  it('rejeita ano diferente do início (ex.: inscrições em 2026, início em 2027)', () => {
    const r = comCodigo('M26-03', '2027-02-01');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['codigo']);
    expect(r.error?.issues[0]?.message).toContain('M27-');
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

describe('idDeReferencia', () => {
  it.each([
    ['fulano.yaml', 'fulano'],
    ['fulano.yml', 'fulano'],
    ['src/content/mentores/fulano.yaml', 'fulano'],
    ['fulano', 'fulano'],
    [' conteudo-pratico.yaml ', 'conteudo-pratico'],
  ])('reduz "%s" ao id "%s"', (valor, id) => {
    expect(idDeReferencia(valor)).toBe(id);
  });

  it('não mexe em valores que não são texto', () => {
    expect(idDeReferencia(undefined)).toBeUndefined();
    expect(idDeReferencia(null)).toBeNull();
  });
});

describe('codigosDuplicados', () => {
  const md = (codigo: string) => `---\ncodigo: ${codigo}\ntitulo: X\n---\nCorpo.\n`;

  it('aponta o código repetido e os arquivos', () => {
    expect(
      codigosDuplicados({
        '../content/mentorias/m26-01.md': md('M26-01'),
        '../content/mentorias/outra.md': md('"M26-01"'),
        '../content/mentorias/m26-02.md': md('M26-02'),
      }),
    ).toEqual([{ codigo: 'M26-01', arquivos: ['m26-01.md', 'outra.md'] }]);
  });

  it('não acusa nada sem repetição ou sem código', () => {
    expect(codigosDuplicados({ 'a.md': md('M26-01'), 'b.md': md('M26-02'), 'c.md': 'sem frontmatter' })).toEqual([]);
  });
});
