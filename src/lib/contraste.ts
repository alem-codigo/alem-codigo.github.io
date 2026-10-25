/**
 * Contraste WCAG 2.x entre duas cores hexadecimais (#rgb ou #rrggbb).
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Mínimos do WCAG 2.1 AA. */
export const AA = {
  /** Texto comum. */
  texto: 4.5,
  /** Texto grande (≥ 24px, ou ≥ 18.66px em negrito) e componentes de interface. */
  textoGrande: 3,
  componente: 3,
} as const;

const RE_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function canais(hex: string): [number, number, number] {
  if (!RE_HEX.test(hex)) {
    throw new TypeError(`Cor inválida: "${hex}". Use #rgb ou #rrggbb.`);
  }
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function linear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const [r, g, b] = canais(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (escuro + 0.05);
}
