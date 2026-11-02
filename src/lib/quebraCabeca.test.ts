import { describe, expect, it } from 'vitest';
import { caminhoDaPeca, ladosDaPeca, ladosInfinitos, medidas, variacoesDaCasa } from './quebraCabeca';

describe('ladosDaPeca', () => {
  it('bordas da grade são retas', () => {
    const l = ladosDaPeca(0, 3, 6);
    expect(l.topo).toBe(0);
    expect(l.esquerda).toBe(0);
    expect(ladosDaPeca(5, 3, 6).direita).toBe(0);
    expect(ladosDaPeca(5, 3, 6).base).toBe(0);
  });

  it('vizinhas sempre encaixam (aba de um lado, furo do outro)', () => {
    for (const colunas of [1, 2, 3]) {
      const total = 6;
      for (let i = 0; i < total; i++) {
        const l = ladosDaPeca(i, colunas, total);
        const direita = i + 1;
        if (l.direita !== 0) expect(ladosDaPeca(direita, colunas, total).esquerda).toBe(-l.direita);
        const abaixo = i + colunas;
        if (l.base !== 0) expect(ladosDaPeca(abaixo, colunas, total).topo).toBe(-l.base);
      }
    }
  });

  it('última linha incompleta: sem aba para uma casa vazia', () => {
    // 5 peças em 3 colunas: a peça 2 (fim da 1ª linha) não tem ninguém embaixo.
    expect(ladosDaPeca(2, 3, 5).base).toBe(0);
  });
});

describe('caminhoDaPeca', () => {
  it('gera um caminho fechado; peça sem encaixes é um retângulo', () => {
    const d = caminhoDaPeca({ topo: 0, direita: 0, base: 0, esquerda: 0 }, medidas(100, 80));
    expect(d).toBe('M0 0 L100 0 L100 80 L0 80 L0 0 Z');
  });

  it('a aba sai da célula e o furo entra nela', () => {
    const m = medidas(100, 100);
    const aba = caminhoDaPeca({ topo: 0, direita: 1, base: 0, esquerda: 0 }, m);
    const furo = caminhoDaPeca({ topo: 0, direita: -1, base: 0, esquerda: 0 }, m);
    expect(aba).toContain(`${100 + m.profundidade} 50`);
    expect(furo).toContain(`${100 - m.profundidade} 50`);
  });
});

describe('ladosInfinitos', () => {
  it('todos os lados têm aba ou furo, e vizinhas encaixam (inclusive fora da grade)', () => {
    for (let l = -2; l <= 3; l++) {
      for (let c = -2; c <= 3; c++) {
        const a = ladosInfinitos(l, c);
        expect([a.topo, a.direita, a.base, a.esquerda].every((e) => e !== 0)).toBe(true);
        expect(ladosInfinitos(l, c + 1).esquerda).toBe(-a.direita);
        expect(ladosInfinitos(l + 1, c).topo).toBe(-a.base);
      }
    }
  });

  it('desloca o caminho', () => {
    const d = caminhoDaPeca({ topo: 0, direita: 0, base: 0, esquerda: 0 }, medidas(10, 10), 20, 30);
    expect(d).toBe('M20 30 L30 30 L30 40 L20 40 L20 30 Z');
  });
});

describe('variacoesDaCasa', () => {
  it('as duas peças de um lado usam a mesma variação', () => {
    const a = variacoesDaCasa(0, 0);
    expect(variacoesDaCasa(0, 1).esquerda).toEqual(a.direita);
    expect(variacoesDaCasa(1, 0).topo).toEqual(a.base);
  });

  it('abas fora do centro, dentro de limites seguros', () => {
    for (let l = -1; l < 4; l++) {
      for (let c = -1; c < 4; c++) {
        const v = variacoesDaCasa(l, c).direita;
        expect(v.posicao).toBeGreaterThanOrEqual(0.36);
        expect(v.posicao).toBeLessThanOrEqual(0.64);
        expect(v.escala).toBeGreaterThanOrEqual(0.82);
        expect(v.escala).toBeLessThanOrEqual(1.14);
      }
    }
  });

  it('o traçado do lado comum coincide nas duas peças', () => {
    const m = medidas(100, 100);
    const a = caminhoDaPeca(ladosInfinitos(0, 0), m, 0, 0, variacoesDaCasa(0, 0));
    const b = caminhoDaPeca(ladosInfinitos(0, 1), m, 100, 0, variacoesDaCasa(0, 1));
    // O topo da aba (ponto mais distante do lado x = 100) aparece nos dois caminhos.
    const pontos = (d: string) => new Set(d.match(/-?\d+(\.\d+)? -?\d+(\.\d+)?/g));
    const comuns = [...pontos(a)].filter((p) => pontos(b).has(p));
    expect(comuns.length).toBeGreaterThanOrEqual(6);
  });
});
