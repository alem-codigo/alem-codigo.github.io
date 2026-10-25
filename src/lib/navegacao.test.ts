import { describe, expect, it } from 'vitest';
import { destinoInscricoes, itemAtivo, type MentoriaResumo } from './navegacao';

describe('itemAtivo', () => {
  it('marca a própria página', () => {
    expect(itemAtivo('/mentorias', '/mentorias')).toBe(true);
    expect(itemAtivo('/mentorias/', '/mentorias')).toBe(true);
  });

  it('marca páginas filhas', () => {
    expect(itemAtivo('/mentorias/m1-26a', '/mentorias')).toBe(true);
  });

  it('não confunde prefixos parecidos', () => {
    expect(itemAtivo('/mentores', '/mentorias')).toBe(false);
    expect(itemAtivo('/mentorias-antigas', '/mentorias')).toBe(false);
  });

  it('a raiz só é ativa na home', () => {
    expect(itemAtivo('/', '/')).toBe(true);
    expect(itemAtivo('/sobre', '/')).toBe(false);
  });
});

const mentoria = (id: string, abertura: string, fechamento: string): MentoriaResumo => ({
  id,
  inscricoes: { abertura, fechamento },
  realizacao: { inicio: '2026-12-01', fim: '2026-12-20' },
});

describe('destinoInscricoes', () => {
  const hoje = '2026-11-05';

  it('sem inscrições abertas, não há botão', () => {
    expect(destinoInscricoes([mentoria('m1-26a', '2026-11-10', '2026-11-20')], hoje)).toBeNull();
    expect(destinoInscricoes([], hoje)).toBeNull();
  });

  it('com uma mentoria aberta, leva direto a ela', () => {
    const lista = [mentoria('m1-26a', '2026-11-01', '2026-11-10'), mentoria('m2-26a', '2026-11-10', '2026-11-20')];
    expect(destinoInscricoes(lista, hoje)).toBe('/mentorias/m1-26a');
  });

  it('com várias abertas, leva à seção da listagem', () => {
    const lista = [mentoria('m1-26a', '2026-11-01', '2026-11-10'), mentoria('m2-26a', '2026-11-05', '2026-11-05')];
    expect(destinoInscricoes(lista, hoje)).toBe('/mentorias#inscricoes-abertas');
  });
});
