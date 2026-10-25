import { describe, expect, it } from 'vitest';
import css from '../styles/tokens.css?raw';
import { AA, contraste } from './contraste';
import { STATUS_MENTORIA } from './status';

/**
 * Verifica no CI os pares de cor dos design tokens (src/styles/tokens.css) contra o WCAG AA,
 * nos temas claro e escuro. Ao criar um token de cor usado como texto ou fundo, inclua o par aqui.
 */

type Tema = 'claro' | 'escuro';
type Paleta = Record<string, Record<Tema, string>>;

const HEX = '#[0-9a-fA-F]{3,6}';
const RE_TOKEN = new RegExp(
  `(--[\\w-]+)\\s*:\\s*(?:light-dark\\(\\s*(${HEX})\\s*,\\s*(${HEX})\\s*\\)|(${HEX}))\\s*;`,
  'g',
);

function lerPaleta(): Paleta {
  const paleta: Paleta = {};
  for (const [, nome, claro, escuro, fixo] of css.matchAll(RE_TOKEN)) {
    paleta[nome!] = { claro: (claro ?? fixo)!, escuro: (escuro ?? fixo)! };
  }
  return paleta;
}

const paleta = lerPaleta();

function cor(token: string, tema: Tema): string {
  const valor = paleta[token]?.[tema];
  if (!valor) throw new Error(`Token de cor não encontrado em tokens.css: ${token}`);
  return valor;
}

/** [primeiro plano, fundo, mínimo] */
type Par = [string, string, number];

const pares: Par[] = [
  // Página, faixas (cabeçalho e rodapé) e cards padrão
  ...(['--cor-fundo', '--cor-faixa', '--card-padrao-fundo'] as const).flatMap((fundo): Par[] => [
    ['--cor-texto', fundo, AA.texto],
    ['--cor-texto-suave', fundo, AA.texto],
    ['--cor-link', fundo, AA.texto],
    ['--cor-foco', fundo, AA.componente],
  ]),

  // Botões: texto branco em texto comum nas duas cores do degradê
  ['--botao-texto', '--botao-fundo', AA.texto],
  ['--botao-texto', '--botao-fundo-2', AA.texto],
  ['--botao-fundo', '--cor-fundo', AA.componente],
  ['--botao-fundo', '--cor-faixa', AA.componente],
  ['--botao-mono-texto', '--botao-mono-fundo', AA.texto],
  ['--botao-mono-fundo', '--cor-fundo', AA.componente],

  // Ícones em ameixa (o desenho também é usado como texto: número dos eixos nos cards)
  ['--icone-cor', '--icone-fundo', AA.componente],
  ['--icone-cor', '--card-padrao-fundo', AA.texto],

  // Cards
  ...(['padrao', 'violeta', 'grafite'] as const).flatMap((v): Par[] => [
    [`--card-${v}-texto`, `--card-${v}-fundo`, AA.texto],
    [`--card-${v}-texto-suave`, `--card-${v}-fundo`, AA.texto],
    [`--card-${v}-link`, `--card-${v}-fundo`, AA.texto],
    ['--botao-texto', `--card-${v}-botao`, AA.texto],
  ]),
  // Botão principal do card. No grafite (encerrada), o card não tem ação principal.
  ['--card-padrao-botao', '--card-padrao-fundo', AA.componente],
  ['--card-violeta-botao', '--card-violeta-fundo', AA.componente],

  // Pílulas de status (Q-08): uma por status, fundo opaco (não depende do card nem da luz)
  ...STATUS_MENTORIA.flatMap((s): Par[] => [
    [`--pilula-${s}-texto`, `--pilula-${s}-fundo`, AA.texto],
    [`--pilula-${s}-ponto`, `--pilula-${s}-fundo`, AA.componente],
  ]),
];

describe('tokens de cor (WCAG 2.1 AA)', () => {
  it('lê os tokens de cor de tokens.css', () => {
    expect(Object.keys(paleta).length).toBeGreaterThan(20);
  });

  for (const tema of ['claro', 'escuro'] as const) {
    describe(`tema ${tema}`, () => {
      it.each(pares)('%s sobre %s ≥ %s:1', (frente, fundo, minimo) => {
        const razao = contraste(cor(frente, tema), cor(fundo, tema));
        expect(razao, `${cor(frente, tema)} sobre ${cor(fundo, tema)} = ${razao.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          minimo,
        );
      });
    });
  }
});

describe('contraste()', () => {
  it('preto sobre branco é 21:1', () => {
    expect(contraste('#000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('é simétrico', () => {
    expect(contraste('#693d84', '#ffffff')).toBeCloseTo(contraste('#ffffff', '#693d84'), 10);
  });

  it('rejeita cor inválida', () => {
    expect(() => contraste('violeta', '#fff')).toThrow(TypeError);
  });
});
