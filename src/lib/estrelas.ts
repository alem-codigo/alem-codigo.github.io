/**
 * Estrelas da avaliação da turma (D-26): 5 estrelas lado a lado, cada uma numa célula de 24×24
 * do SVG, com a parte cheia recortada na largura proporcional à média. Funções puras, testadas.
 */

export const TOTAL_ESTRELAS = 5;
/** Largura de cada célula no `viewBox` (o desenho da estrela vem do Lucide, 24×24). */
export const CELULA = 24;
/** Onde o desenho da estrela começa e termina dentro da célula (o resto é margem). */
const INICIO = 2.16;
const FIM = 21.84;

/** Média como aparece no texto (uma casa decimal), limitada a 0–5: as estrelas seguem o número escrito. */
export const mediaExibida = (media: number): number =>
  Math.min(TOTAL_ESTRELAS, Math.max(0, Math.round(media * 10) / 10));

/**
 * Largura (no `viewBox`) da parte cheia: estrelas inteiras ocupam a célula toda; a fração da
 * última é medida sobre o desenho, não sobre a célula (4,5 mostra meia estrela de verdade).
 */
export function larguraCheia(media: number): number {
  const m = mediaExibida(media);
  const inteiras = Math.floor(m);
  const fracao = Math.round((m - inteiras) * 10) / 10;
  const parcial = fracao > 0 ? INICIO + fracao * (FIM - INICIO) : 0;
  return Number((inteiras * CELULA + parcial).toFixed(3));
}

/** Desenho da estrela (Lucide, ISC). */
export const CAMINHO_ESTRELA =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';
