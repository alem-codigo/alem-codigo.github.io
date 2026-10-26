/**
 * Regras de apresentação das mentorias (home e listagens). Funções puras, sem o runtime do
 * Astro, para serem testadas com Vitest. Datas de calendário sempre como `YYYY-MM-DD`, sem
 * passar por `Date` (seção 4 da spec).
 */
import { calcularStatus, type Cronograma, type StatusMentoria } from './status';

/** `2026-11-05` → `05/11`, ou `05/11/2027` se o ano for diferente do de `hoje`. */
export function formatarData(data: string, hoje: string): string {
  const [ano, mes, dia] = data.split('-');
  return ano === hoje.slice(0, 4) ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

/** Período com o ano no fim quando necessário: `06/04 – 24/04/2026`. */
export function formatarPeriodo(inicio: string, fim: string, hoje: string, comAno = false): string {
  const [anoInicio, mesInicio, diaInicio] = inicio.split('-');
  const [anoFim, mesFim, diaFim] = fim.split('-');
  const mostrarAno = comAno || anoFim !== hoje.slice(0, 4);
  const textoInicio = anoInicio !== anoFim ? `${diaInicio}/${mesInicio}/${anoInicio}` : `${diaInicio}/${mesInicio}`;
  const textoFim = mostrarAno ? `${diaFim}/${mesFim}/${anoFim}` : `${diaFim}/${mesFim}`;
  return `${textoInicio} – ${textoFim}`;
}

/** Linha de inscrições do card, conforme o status. */
export function textoInscricoes(c: Cronograma, status: StatusMentoria, hoje: string): string {
  const { abertura, fechamento } = c.inscricoes;
  switch (status) {
    case 'em-breve':
      return `Inscrições de ${formatarData(abertura, hoje)} a ${formatarData(fechamento, hoje)}`;
    case 'inscricoes-abertas':
      return `Inscrições até ${formatarData(fechamento, hoje)}`;
    default:
      return `Inscrições encerradas em ${formatarData(fechamento, hoje)}`;
  }
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;
const MESES_EXTENSO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

export interface DataDestaque {
  dia: string;
  mes: string;
  ano: string;
  /** Para leitores de tela: `11 de janeiro de 2027`. */
  extenso: string;
}

/** Data em destaque no banner do card (início da realização): `2027-01-11` → 11 / JAN / 2027. */
export function dataDestaque(data: string): DataDestaque {
  const [ano = '', mes = '', dia = ''] = data.split('-');
  const i = Number(mes) - 1;
  return { dia, mes: MESES[i] ?? '', ano, extenso: `${Number(dia)} de ${MESES_EXTENSO[i] ?? ''} de ${ano}` };
}

export interface ComStatus<T> {
  mentoria: T;
  status: StatusMentoria;
}

export interface GruposHome<T> {
  /** Ordem: fechamento mais próximo primeiro. */
  abertas: ComStatus<T>[];
  /** Ordem: abertura mais próxima primeiro. */
  emBreve: ComStatus<T>[];
  /** Em andamento (pelo fim mais próximo) e depois inscrições encerradas, que ainda vão começar (pelo início). */
  emAndamento: ComStatus<T>[];
}

/** Separa as mentorias nos blocos da home. Encerradas ficam de fora. */
export function agruparParaHome<T extends Cronograma>(mentorias: readonly T[], hoje: string): GruposHome<T> {
  const comStatus = mentorias.map((mentoria) => ({ mentoria, status: calcularStatus(mentoria, hoje) }));
  const de = (...s: StatusMentoria[]) => comStatus.filter((m) => s.includes(m.status));
  const porData = (data: (c: Cronograma) => string) => (a: ComStatus<T>, b: ComStatus<T>) =>
    data(a.mentoria).localeCompare(data(b.mentoria));

  return {
    abertas: de('inscricoes-abertas').sort(porData((c) => c.inscricoes.fechamento)),
    emBreve: de('em-breve').sort(porData((c) => c.inscricoes.abertura)),
    emAndamento: [
      ...de('em-andamento').sort(porData((c) => c.realizacao.fim)),
      ...de('inscricoes-encerradas').sort(porData((c) => c.realizacao.inicio)),
    ],
  };
}

/**
 * Mentorias em destaque na home ("Conheça as mentorias"): inscrições abertas primeiro, depois
 * em breve e em andamento (mesma ordem de `agruparParaHome`). Encerradas ficam de fora.
 */
export function destaquesHome<T extends Cronograma>(mentorias: readonly T[], hoje: string, limite = 3): ComStatus<T>[] {
  const { abertas, emBreve, emAndamento } = agruparParaHome(mentorias, hoje);
  return [...abertas, ...emBreve, ...emAndamento].slice(0, limite);
}

export interface MenuMentorias<T> {
  /** Bloco grande: a marcada como destaque ou, sem nenhuma, a primeira da home. */
  destaque: ComStatus<T> | null;
  /** Blocos menores: as próximas na ordem da home, sem o destaque. */
  proximas: ComStatus<T>[];
}

/** Conteúdo do menu de Mentorias do cabeçalho. Encerradas nunca entram. */
export function menuMentorias<T extends Cronograma & { destaque: boolean }>(
  mentorias: readonly T[],
  hoje: string,
  quantidade = 3,
): MenuMentorias<T> {
  const ordem = destaquesHome(mentorias, hoje, Infinity);
  const destaque = ordem.find((d) => d.mentoria.destaque) ?? ordem[0] ?? null;
  return { destaque, proximas: ordem.filter((d) => d !== destaque).slice(0, quantidade) };
}

/** `['A', 'B', 'C']` → `A, B e C`. */
export function juntarLista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}
