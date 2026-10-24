/**
 * Datas de calendário (`YYYY-MM-DD`): sem horário e sem fuso. Nunca passam por
 * conversão de fuso; são comparadas como string (ordem lexicográfica = cronológica).
 * Ver seção 4 da spec.
 */
export const FUSO_PROGRAMA = 'America/Sao_Paulo';

const RE_DATA_CALENDARIO = /^\d{4}-\d{2}-\d{2}$/;

const formatoDiaSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_PROGRAMA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Data de calendário de São Paulo no instante informado. */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return formatoDiaSaoPaulo.format(agora);
}

/** Formato `YYYY-MM-DD` e data existente no calendário (rejeita 2026-02-30). */
export function ehDataCalendario(valor: string): boolean {
  if (!RE_DATA_CALENDARIO.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/**
 * O YAML interpreta `2026-04-06` como `Date` à meia-noite UTC. Usar os componentes
 * UTC devolve exatamente o dia escrito no arquivo, sem deslocamento de fuso.
 */
export function normalizarDataCalendario(valor: unknown): unknown {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  return valor;
}
