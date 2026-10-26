import { describe, expect, it } from 'vitest';
import config from '../../.pages.yml?raw';
import { NOMES_ICONES_EIXO } from './eixos';

describe('ícones dos eixos', () => {
  it('a lista do painel (.pages.yml) é a mesma do código', () => {
    const bloco = /- name: icone[\s\S]*?values:\n((?:\s+- value: .+\n\s+label: .+\n)+)/.exec(config)?.[1] ?? '';
    const valores = [...bloco.matchAll(/- value: (\S+)/g)].map((r) => r[1]);
    expect(valores).toEqual(NOMES_ICONES_EIXO);
  });
});
