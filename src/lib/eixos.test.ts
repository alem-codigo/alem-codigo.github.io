import { describe, expect, it } from 'vitest';
import config from '../../.pages.yml?raw';
import { NOMES_ICONES_EIXO, paragrafos } from './eixos';

describe('ícones dos eixos', () => {
  it('a lista do painel (.pages.yml) é a mesma do código', () => {
    const bloco = /- name: icone[\s\S]*?values:\n((?:\s+- value: .+\n\s+label: .+\n)+)/.exec(config)?.[1] ?? '';
    const valores = [...bloco.matchAll(/- value: (\S+)/g)].map((r) => r[1]);
    expect(valores).toEqual(NOMES_ICONES_EIXO);
  });
});

describe('paragrafos', () => {
  it('separa por linha em branco e junta quebras simples', () => {
    expect(paragrafos('Primeiro\nainda o primeiro.\n\nSegundo.\r\n  \r\nTerceiro.')).toEqual([
      'Primeiro ainda o primeiro.',
      'Segundo.',
      'Terceiro.',
    ]);
  });

  it('texto vazio ou ausente não gera parágrafos', () => {
    expect(paragrafos(undefined)).toEqual([]);
    expect(paragrafos('  \n\n ')).toEqual([]);
  });
});
