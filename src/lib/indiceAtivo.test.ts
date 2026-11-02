import { describe, expect, it } from 'vitest';
import { secaoAtiva } from './indiceAtivo';

describe('secaoAtiva', () => {
  it('nenhuma antes do primeiro título passar da linha', () => {
    expect(secaoAtiva([330, 900, 1500], 250, false)).toBe(-1);
  });

  it('a última seção cujo topo passou da linha', () => {
    expect(secaoAtiva([-800, -100, 240, 700], 250, false)).toBe(2);
    expect(secaoAtiva([-800, 250, 600], 250, false)).toBe(1);
  });

  it('no fim da página, a última (seções curtas que nunca chegam à linha)', () => {
    expect(secaoAtiva([-900, -300, 400, 600], 250, true)).toBe(3);
  });

  it('sem seções', () => {
    expect(secaoAtiva([], 250, true)).toBe(-1);
  });
});
