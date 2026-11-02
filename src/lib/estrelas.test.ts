import { describe, expect, it } from 'vitest';
import { CELULA, larguraCheia, mediaExibida } from './estrelas';

describe('mediaExibida', () => {
  it('arredonda para uma casa, como o texto', () => {
    expect(mediaExibida(4.66)).toBe(4.7);
    expect(mediaExibida(4.04)).toBe(4);
  });

  it('fica entre 0 e 5', () => {
    expect(mediaExibida(5.4)).toBe(5);
    expect(mediaExibida(-1)).toBe(0);
  });
});

describe('larguraCheia', () => {
  it('estrelas inteiras ocupam a célula toda', () => {
    expect(larguraCheia(5)).toBe(5 * CELULA);
    expect(larguraCheia(3)).toBe(3 * CELULA);
    expect(larguraCheia(0)).toBe(0);
  });

  it('meia estrela é metade do desenho, não da célula', () => {
    expect(larguraCheia(4.5)).toBeCloseTo(4 * CELULA + 12, 3);
  });

  it('a fração segue a média arredondada', () => {
    expect(larguraCheia(4.66)).toBe(larguraCheia(4.7));
    expect(larguraCheia(4.7)).toBeGreaterThan(larguraCheia(4.5));
    expect(larguraCheia(4.7)).toBeLessThan(5 * CELULA);
  });
});
