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

/**
 * Vitrine da home: só inscrições abertas (fechamento mais próximo primeiro) e as próximas,
 * em breve (abertura mais próxima primeiro). Sem nenhuma, a home não mostra a seção.
 */
export function vitrineHome<T extends Cronograma>(mentorias: readonly T[], hoje: string, limite = 3): ComStatus<T>[] {
  const { abertas, emBreve } = agruparParaHome(mentorias, hoje);
  return [...abertas, ...emBreve].slice(0, limite);
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

export interface Listagem<T> {
  /** Não encerradas, na ordem da home (abertas, em breve, em andamento e inscrições encerradas). */
  ativas: ComStatus<T>[];
  /** Encerradas, da que terminou mais recentemente para a mais antiga. */
  encerradas: ComStatus<T>[];
}

/** Conteúdo da listagem `/mentorias`: as ativas e, numa seção própria, as encerradas. */
export function listagemMentorias<T extends Cronograma>(mentorias: readonly T[], hoje: string): Listagem<T> {
  const encerradas = mentorias
    .map((mentoria) => ({ mentoria, status: calcularStatus(mentoria, hoje) }))
    .filter((m) => m.status === 'encerrada')
    .sort((a, b) => b.mentoria.realizacao.fim.localeCompare(a.mentoria.realizacao.fim));
  return { ativas: destaquesHome(mentorias, hoje, Infinity), encerradas };
}

/**
 * Caminho da página da mentoria, com barra no fim: é a URL que o GitHub Pages serve
 * (`/mentorias/m26-01/index.html`) e a mesma da canônica e do sitemap, sem redirecionamento.
 */
export const caminhoMentoria = (id: string): string => `/mentorias/${id}/`;

/** Resultado da turma, como sai do schema (só o que as regras de apresentação usam). */
export interface ResultadoTurma {
  inscritos?: number;
  concluintes?: number;
  avaliacao?: { media: number; respostas: number };
  depoimentos: { texto: string; autor: string }[];
}

/** Com menos respostas, a média engana (duas notas 5 viram "5,0"): o site não mostra. */
export const MIN_RESPOSTAS_AVALIACAO = 5;
/** Nota média a partir da qual a mentoria entra em destaque na galeria. */
export const NOTA_DESTAQUE = 4.5;
/** Mínimo de encerradas com inscritos informados para comparar a procura entre elas. */
const MIN_PARA_COMPARAR_INSCRITOS = 4;

/** Avaliação que pode aparecer no site, ou `undefined` (sem avaliação ou com poucas respostas). */
export function avaliacaoPublicavel(r: ResultadoTurma | undefined): ResultadoTurma['avaliacao'] {
  return r?.avaliacao && r.avaliacao.respostas >= MIN_RESPOSTAS_AVALIACAO ? r.avaliacao : undefined;
}

/**
 * Destaques da galeria de encerradas (blocos grandes do mosaico). Entra em destaque a mentoria:
 * - feita em parceria com empresa;
 * - com nota média ≥ 4,5 (e ao menos 5 respostas); ou
 * - entre as mais procuradas: inscritos no quarto superior das encerradas que informaram o número
 *   (comparação só a partir de 4 delas; com menos, o critério não se aplica).
 */
export function destaquesDaGaleria<T extends { parceiro?: unknown; resultado?: ResultadoTurma }>(
  lista: readonly T[],
): Set<T> {
  const inscritos = lista
    .map((m) => m.resultado?.inscritos)
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => b - a);
  const corte =
    inscritos.length >= MIN_PARA_COMPARAR_INSCRITOS ? inscritos[Math.ceil(inscritos.length / 4) - 1] : undefined;

  return new Set(
    lista.filter((m) => {
      if (m.parceiro) return true;
      const nota = avaliacaoPublicavel(m.resultado);
      if (nota && nota.media >= NOTA_DESTAQUE) return true;
      const n = m.resultado?.inscritos;
      return corte !== undefined && n !== undefined && n > 0 && n >= corte;
    }),
  );
}

const numeroBR = new Intl.NumberFormat('pt-BR');
const notaBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** `1200` → `1.200`. */
export const formatarInteiro = (n: number): string => numeroBR.format(n);
/** `4.7` → `4,7`; `5` → `5,0`. */
export const formatarNota = (n: number): string => notaBR.format(n);

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

/**
 * Período curto da realização, sempre com ano (a galeria mistura anos):
 * `mar 2026`, `mar – abr 2026` ou `dez 2026 – fev 2027`.
 */
export function periodoCurto(inicio: string, fim: string): string {
  const [anoI = '', mesI = ''] = inicio.split('-');
  const [anoF = '', mesF = ''] = fim.split('-');
  const mes = (m: string) => MESES_CURTOS[Number(m) - 1] ?? '';
  if (anoI !== anoF) return `${mes(mesI)} ${anoI} – ${mes(mesF)} ${anoF}`;
  if (mesI === mesF) return `${mes(mesI)} ${anoI}`;
  return `${mes(mesI)} – ${mes(mesF)} ${anoF}`;
}

/** Valor do filtro de parceria na URL: `Qlik Brasil` → `qlik-brasil` (sem acentos nem espaços). */
export function slugParceiro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface OpcaoParceria {
  valor: string;
  rotulo: string;
}

/**
 * Opções do filtro de parceria (listagem). "Qualquer parceria" só quando há mais de um parceiro
 * (com um só, seria igual à opção dele); um item por parceiro, em ordem alfabética.
 * Lista vazia quando o filtro não separa nada: nenhuma parceria, ou todas com o mesmo parceiro.
 */
export function opcoesParceria(parceiros: readonly (string | undefined)[]): OpcaoParceria[] {
  const nomes = new Map<string, string>();
  for (const nome of parceiros) if (nome) nomes.set(slugParceiro(nome), nome.trim());
  const semParceria = parceiros.some((p) => !p);
  if (nomes.size === 0 || (nomes.size === 1 && !semParceria)) return [];
  const porParceiro = [...nomes]
    .sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))
    .map(([valor, nome]) => ({ valor, rotulo: `Em parceria com ${nome}` }));
  return nomes.size > 1 ? [{ valor: 'qualquer', rotulo: 'Qualquer parceria' }, ...porParceiro] : porParceiro;
}

/** `['A', 'B', 'C']` → `A, B e C`. */
export function juntarLista(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}
