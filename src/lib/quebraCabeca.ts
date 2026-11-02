/**
 * Geometria das peças de quebra-cabeça da página /eixos. Funções puras (testadas com Vitest).
 *
 * Cada peça ocupa uma célula W×H da grade. Nas bordas internas da grade há uma aba (para fora) de
 * um lado e o furo correspondente (para dentro) do outro; nas bordas externas, lado reto. As abas
 * alternam como num quebra-cabeça de verdade (xadrez), então duas peças vizinhas sempre encaixam.
 */

/** 1 = aba para fora, -1 = furo para dentro, 0 = lado reto (borda da grade). */
export type Encaixe = 1 | -1 | 0;

export interface Lados {
  topo: Encaixe;
  direita: Encaixe;
  base: Encaixe;
  esquerda: Encaixe;
}

const oposto = (e: Encaixe): Encaixe => (e === 0 ? 0 : e === 1 ? -1 : 1);

/**
 * Encaixe de cada lado da peça `i` numa grade de `colunas` colunas com `total` peças.
 * A aba da direita aponta para fora nas casas "pretas" do xadrez (linha + coluna par) e a de baixo
 * nas "brancas"; a vizinha recebe o oposto, o que garante o encaixe.
 */
export function ladosDaPeca(i: number, colunas: number, total: number): Lados {
  const linha = Math.floor(i / colunas);
  const coluna = i % colunas;
  const existe = (l: number, c: number) => c >= 0 && c < colunas && l >= 0 && l * colunas + c < total;

  // Direção da borda vertical entre (l, c) e (l, c + 1), vista da peça da esquerda.
  const direitaDe = (l: number, c: number): Encaixe => ((l + c) % 2 === 0 ? 1 : -1);
  // Direção da borda horizontal entre (l, c) e (l + 1, c), vista da peça de cima.
  const baseDe = (l: number, c: number): Encaixe => ((l + c) % 2 === 0 ? -1 : 1);

  return {
    topo: existe(linha - 1, coluna) ? oposto(baseDe(linha - 1, coluna)) : 0,
    direita: existe(linha, coluna + 1) ? direitaDe(linha, coluna) : 0,
    base: existe(linha + 1, coluna) ? baseDe(linha, coluna) : 0,
    esquerda: existe(linha, coluna - 1) ? oposto(direitaDe(linha, coluna - 1)) : 0,
  };
}

/**
 * Encaixes de uma casa (linha, coluna) num quebra-cabeça sem bordas: todos os lados têm aba ou
 * furo, no mesmo xadrez de `ladosDaPeca`. Usado quando a grade continua em peças "fantasmas" em
 * volta (linhas e colunas negativas ou além da grade também valem).
 */
export function ladosInfinitos(linha: number, coluna: number): Lados {
  const direitaDe = (l: number, c: number): Encaixe => ((((l + c) % 2) + 2) % 2 === 0 ? 1 : -1);
  const baseDe = (l: number, c: number): Encaixe => ((((l + c) % 2) + 2) % 2 === 0 ? -1 : 1);
  return {
    topo: oposto(baseDe(linha - 1, coluna)),
    direita: direitaDe(linha, coluna),
    base: baseDe(linha, coluna),
    esquerda: oposto(direitaDe(linha, coluna - 1)),
  };
}

export interface Medidas {
  /** Largura e altura da célula. */
  largura: number;
  altura: number;
  /** Meia largura da base da aba e profundidade da aba. */
  meiaBase: number;
  profundidade: number;
}

/** Medidas proporcionais à célula: a aba é igual em todos os lados (usa o menor lado). */
export function medidas(largura: number, altura: number): Medidas {
  const menor = Math.min(largura, altura);
  return { largura, altura, meiaBase: menor * 0.15, profundidade: menor * 0.14 };
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Trecho de um lado, de (x0, y0) a (x1, y1), com a aba no meio. (nx, ny) é a normal para fora da
 * peça; `encaixe` diz se a aba sai (1), entra (-1) ou não existe (0).
 */
function lado(x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, encaixe: Encaixe, m: Medidas): string {
  if (encaixe === 0) return `L${r(x1)} ${r(y1)}`;
  const comp = Math.hypot(x1 - x0, y1 - y0);
  const ex = (x1 - x0) / comp;
  const ey = (y1 - y0) / comp;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const a = m.meiaBase;
  const k = m.profundidade * encaixe;
  // Ponto local (ao longo do lado, para fora) → coordenadas da peça.
  const p = (u: number, v: number) => `${r(cx + u * ex + v * nx)} ${r(cy + u * ey + v * ny)}`;
  return [
    `L${p(-a, 0)}`,
    `C${p(-0.35 * a, 0)} ${p(-0.25 * a, 0.25 * k)} ${p(-0.45 * a, 0.45 * k)}`,
    `C${p(-0.75 * a, 0.75 * k)} ${p(-0.55 * a, k)} ${p(0, k)}`,
    `C${p(0.55 * a, k)} ${p(0.75 * a, 0.75 * k)} ${p(0.45 * a, 0.45 * k)}`,
    `C${p(0.25 * a, 0.25 * k)} ${p(0.35 * a, 0)} ${p(a, 0)}`,
    `L${r(x1)} ${r(y1)}`,
  ].join(' ');
}

/**
 * Caminho SVG da peça (sentido horário, a partir do canto superior esquerdo). `x` e `y` deslocam a
 * peça, para desenhar várias num mesmo SVG.
 */
export function caminhoDaPeca(l: Lados, m: Medidas, x = 0, y = 0): string {
  const { largura: w, altura: h } = m;
  return [
    `M${r(x)} ${r(y)}`,
    lado(x, y, x + w, y, 0, -1, l.topo, m),
    lado(x + w, y, x + w, y + h, 1, 0, l.direita, m),
    lado(x + w, y + h, x, y + h, 0, 1, l.base, m),
    lado(x, y + h, x, y, -1, 0, l.esquerda, m),
    'Z',
  ].join(' ');
}
