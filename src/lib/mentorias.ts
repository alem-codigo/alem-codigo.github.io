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

/** Frase de data que o card mostra em destaque, conforme o status. */
export function textoDataStatus(c: Cronograma, status: StatusMentoria, hoje: string): string {
  switch (status) {
    case 'em-breve':
      return `Inscrições a partir de ${formatarData(c.inscricoes.abertura, hoje)}`;
    case 'inscricoes-abertas':
      return `Inscrições até ${formatarData(c.inscricoes.fechamento, hoje)}`;
    case 'inscricoes-encerradas':
      return `Começa em ${formatarData(c.realizacao.inicio, hoje)}`;
    case 'em-andamento':
      return `Termina em ${formatarData(c.realizacao.fim, hoje)}`;
    case 'encerrada':
      return formatarPeriodo(c.realizacao.inicio, c.realizacao.fim, hoje, true);
  }
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

/** `['A', 'B', 'C']` → `A, B e C`. */
export function juntarLista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}
