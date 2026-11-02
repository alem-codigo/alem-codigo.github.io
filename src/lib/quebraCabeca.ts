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


/** Variação de um encaixe: posição ao longo do lado (0–1) e escala da aba. */
export interface Variacao {
  /** Posição do centro da aba: da esquerda para a direita (lados horizontais) ou de cima para baixo (verticais). */
  posicao: number;
  escala: number;
}

const CENTRO: Variacao = { posicao: 0.5, escala: 1 };

/** Número "aleatório" fixo para cada lado da grade (o mesmo nas duas peças que o dividem). */
function ruido(tipo: number, linha: number, coluna: number, canal: number): number {
  const x = Math.sin(linha * 12.9898 + coluna * 78.233 + tipo * 37.719 + canal * 4.581) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Variação do lado de baixo (`h`) ou da direita (`v`) da casa (linha, coluna): abas fora do centro e
 * de tamanhos diferentes, para o quebra-cabeça não parecer simétrico.
 */
export function variacaoDoLado(tipo: 'h' | 'v', linha: number, coluna: number): Variacao {
  const t = tipo === 'h' ? 1 : 2;
  return { posicao: 0.36 + ruido(t, linha, coluna, 1) * 0.28, escala: 0.82 + ruido(t, linha, coluna, 2) * 0.32 };
}

export interface Variacoes {
  topo: Variacao;
  direita: Variacao;
  base: Variacao;
  esquerda: Variacao;
}

/** Variações dos quatro lados da casa (linha, coluna), coerentes com as vizinhas. */
export function variacoesDaCasa(linha: number, coluna: number): Variacoes {
  return {
    topo: variacaoDoLado('h', linha - 1, coluna),
    direita: variacaoDoLado('v', linha, coluna),
    base: variacaoDoLado('h', linha, coluna),
    esquerda: variacaoDoLado('v', linha, coluna - 1),
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Trecho de um lado, de (x0, y0) a (x1, y1), com a aba. (nx, ny) é a normal para fora da peça;
 * `encaixe` diz se a aba sai (1), entra (-1) ou não existe (0). A posição da aba é medida no
 * sentido "canônico" do lado (esquerda→direita ou cima→baixo), para as duas peças coincidirem.
 */
function lado(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  nx: number,
  ny: number,
  encaixe: Encaixe,
  m: Medidas,
  v: Variacao,
): string {
  if (encaixe === 0) return `L${r(x1)} ${r(y1)}`;
  const comp = Math.hypot(x1 - x0, y1 - y0);
  const ex = (x1 - x0) / comp;
  const ey = (y1 - y0) / comp;
  const vertical = x0 === x1;
  const cx = vertical ? x0 : Math.min(x0, x1) + v.posicao * Math.abs(x1 - x0);
  const cy = vertical ? Math.min(y0, y1) + v.posicao * Math.abs(y1 - y0) : y0;
  const a = m.meiaBase * v.escala;
  const k = m.profundidade * v.escala * encaixe;
  // Ponto local (ao longo do lado, para fora) → coordenadas da peça.
  const p = (u: number, w: number) => `${r(cx + u * ex + w * nx)} ${r(cy + u * ey + w * ny)}`;
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
 * peça, para desenhar várias num mesmo SVG; `variacoes` tira as abas do centro (sem ela, centradas).
 */
export function caminhoDaPeca(
  l: Lados,
  m: Medidas,
  x = 0,
  y = 0,
  variacoes: Variacoes = { topo: CENTRO, direita: CENTRO, base: CENTRO, esquerda: CENTRO },
): string {
  const { largura: w, altura: h } = m;
  return [
    `M${r(x)} ${r(y)}`,
    lado(x, y, x + w, y, 0, -1, l.topo, m, variacoes.topo),
    lado(x + w, y, x + w, y + h, 1, 0, l.direita, m, variacoes.direita),
    lado(x + w, y + h, x, y + h, 0, 1, l.base, m, variacoes.base),
    lado(x, y + h, x, y, -1, 0, l.esquerda, m, variacoes.esquerda),
    'Z',
  ].join(' ');
}
