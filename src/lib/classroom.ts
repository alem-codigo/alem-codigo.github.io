/**
 * Portal da turma (Fase 2, D-34): modelo do conteúdo e regras de apresentação. O conteúdo vem
 * da API do Classroom, buscado no navegador com o token do próprio aluno (classroomApi.ts); nada
 * disso passa pelo build nem pelo repositório. Funções puras, testadas em classroom.test.ts.
 * Datas com horário são instantes ISO 8601 e só são exibidas no fuso de São Paulo.
 */
import { FUSO_PROGRAMA, hojeEmSaoPaulo } from './datas';
import { dataDestaque, type DataDestaque } from './mentorias';
import type { StatusMentoria } from './status';

/* ---------- Modelo ---------- */

export type AnexoTurma =
  | { tipo: 'youtube'; titulo: string; youtubeId: string }
  | { tipo: 'drive' | 'form' | 'link'; titulo: string; url: string };

export interface ItemTurma {
  id: string;
  tipo: 'atividade' | 'material';
  titulo: string;
  /** Texto puro; `""` quando não houver. */
  descricao: string;
  /** `null` sem tópico (ou com tópico que não veio na lista). */
  topicoId: string | null;
  publicadoEm: string;
  /** Só em atividades; `null` sem prazo. */
  prazo: string | null;
  anexos: AnexoTurma[];
  /** Item no Classroom (entregar a atividade, comentar). */
  link: string | null;
}

export interface TopicoTurma {
  id: string;
  nome: string;
  ordem: number;
}

export interface ConteudoTurma {
  courseId: string;
  nome: string;
  /** Turma no Classroom. */
  link: string;
  /** Turma arquivada no Classroom (`courseState: ARCHIVED`): só consulta, sem entregas. */
  arquivada: boolean;
  topicos: TopicoTurma[];
  itens: ItemTurma[];
}

/* ---------- Links ---------- */

const RE_URL = /https?:\/\/[^\s<>"')\]]+/gi;
const RE_ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

function hostDaUrl(url: string): string {
  return /^https?:\/\/([^/?#:]+)/i.exec(url)?.[1]?.toLowerCase() ?? '';
}

const hostCasa = (host: string, dominio: string) => host === dominio || host.endsWith(`.${dominio}`);

/** Só `https://` passa para um `href` (o resto vira texto). */
export function urlSegura(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Link vindo do Classroom: `http://` vira `https://` antes de `urlSegura` (o link automático do Meet
 * da turma, "Class video meeting", chega como `http://meet.google.com/…`).
 */
export function urlDoClassroom(url: unknown): string | null {
  return urlSegura(typeof url === 'string' ? url.replace(/^http:\/\//i, 'https://') : url);
}

/** Formulário do Google colado como link (`forms.gle/…` ou `docs.google.com/forms/…`). */
export function ehLinkDeFormulario(url: string): boolean {
  const host = hostDaUrl(url);
  return host === 'forms.gle' || (host === 'docs.google.com' && /^https?:\/\/[^/]+\/forms\//i.test(url));
}

/** ID de 11 caracteres de um link do YouTube (youtu.be, watch?v=, /live/, /shorts/, /embed/). */
export function extrairIdYoutube(url: string): string | null {
  const host = hostDaUrl(url);
  const caminho = url.replace(/^https?:\/\/[^/]+/i, '').split('#')[0] ?? '';
  let id: string | undefined;
  if (host === 'youtu.be') {
    id = caminho.split('?')[0]?.split('/')[1];
  } else if (hostCasa(host, 'youtube.com') || hostCasa(host, 'youtube-nocookie.com')) {
    id = /[?&]v=([^&]+)/.exec(caminho)?.[1] ?? /^\/(?:live|shorts|embed|v)\/([^/?]+)/.exec(caminho)?.[1];
  }
  return id && RE_ID_YOUTUBE.test(id) ? id : null;
}

export const urlDoVideo = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Link da turma a partir do ID: o código depois de `/c/` é o ID em base64url (inverso de `idDoLinkDaTurma`). */
export function linkDaTurma(courseId: string): string {
  const codigo = btoa(courseId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `https://classroom.google.com/c/${codigo}`;
}

/* ---------- Regras do portal ---------- */

/**
 * Status em que a página oferece o acesso à turma: a partir do fechamento das inscrições (os
 * convites saem e o material começa a ser publicado) e depois do fim, como arquivo.
 */
export const STATUS_COM_PORTAL: readonly StatusMentoria[] = ['inscricoes-encerradas', 'em-andamento', 'encerrada'];

export const mostrarPortal = (status: StatusMentoria): boolean => STATUS_COM_PORTAL.includes(status);

export interface GrupoCronograma {
  /** `null` para os itens sem tópico. */
  id: string | null;
  /** `null` quando a turma não tem tópicos (lista simples, sem título de grupo). */
  nome: string | null;
  itens: ItemTurma[];
}

const porPublicacao = (a: ItemTurma, b: ItemTurma) =>
  Date.parse(a.publicadoEm) - Date.parse(b.publicadoEm) || a.id.localeCompare(b.id);

/**
 * Itens agrupados por tópico, na ordem dos tópicos; dentro de cada um, do mais antigo para o
 * mais recente. Itens sem tópico vêm primeiro, no grupo "Geral" (como no Classroom); sem nenhum
 * tópico com itens, um grupo só, sem nome. Tópicos sem itens não aparecem.
 */
export function cronogramaPorTopico(c: Pick<ConteudoTurma, 'topicos' | 'itens'>): GrupoCronograma[] {
  const itens = [...c.itens].sort(porPublicacao);
  const semTopico = itens.filter((i) => i.topicoId === null);
  const topicos = [...c.topicos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((t) => ({ id: t.id, nome: t.nome, itens: itens.filter((i) => i.topicoId === t.id) }))
    .filter((g) => g.itens.length > 0);
  if (topicos.length === 0) return semTopico.length > 0 ? [{ id: null, nome: null, itens: semTopico }] : [];
  return semTopico.length > 0 ? [{ id: null, nome: 'Geral', itens: semTopico }, ...topicos] : topicos;
}

export type ItemComPrazo = ItemTurma & { prazo: string };

/** Atividades com prazo ainda por vencer, do mais próximo para o mais distante. */
export function proximosPrazos(itens: readonly ItemTurma[], agora: Date, limite = 3): ItemComPrazo[] {
  return itens
    .filter((i): i is ItemComPrazo => i.prazo !== null && Date.parse(i.prazo) > agora.getTime())
    .sort((a, b) => Date.parse(a.prazo) - Date.parse(b.prazo) || a.id.localeCompare(b.id))
    .slice(0, limite);
}

/* ---------- Lives (materiais do Classroom) ----------
 * Sem acesso à agenda (D-34), a live é um item publicado num tópico com a palavra "Live" (ou
 * "Aula ao vivo") e a data e a hora no próprio título: "Live 11/11 19h30 · Sprint planning",
 * "Última Live - dia 22/04 às 19:30" (aceita "11/11/2026", "19:30", "19h30" e "19h"). Títulos com
 * "Gravação" são a gravação de uma live que já aconteceu e ficam só no cronograma. O link é o
 * primeiro anexo com link (YouTube, Meet, Teams…) ou, sem anexo, o primeiro link da descrição. */

/** Duração presumida de uma live, para ela continuar em "Próximas lives" enquanto acontece. */
export const DURACAO_LIVE_MS = 2 * 60 * 60 * 1000;

const RE_TITULO_LIVE = /(?:^|[^\p{L}\p{N}])(?:live|aula ao vivo)(?![\p{L}\p{N}])/iu;
const RE_GRAVACAO = /grava[çc][ãa]o/i;
const RE_DATA_HORA = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\D{1,8}?(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i;

export interface LiveTurma {
  itemId: string;
  titulo: string;
  inicio: string;
  fim: string;
  url: string | null;
  /** Link do YouTube (assistir) ou sala de reunião (entrar). */
  tipoLink: 'youtube' | 'sala' | null;
}

const formatoPartes = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_PROGRAMA,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

/** Instante de uma data e hora de parede em São Paulo (sem supor um offset fixo). */
export function instanteEmSaoPaulo(ano: number, mes: number, dia: number, hora: number, minuto: number): Date {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto);
  let t = alvo + 3 * 60 * 60 * 1000;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(formatoPartes.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]));
    const visto = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!);
    t += alvo - visto;
  }
  return new Date(t);
}

/** Data e hora da live a partir do título; o ano, se faltar, é o da publicação (ou o seguinte). */
export function dataDaLive(titulo: string, publicadoEm: string): Date | null {
  const m = RE_DATA_HORA.exec(titulo);
  if (!m) return null;
  const [dia, mes, hora, minuto] = [m[1], m[2], m[4], m[5] ?? '0'].map(Number) as [number, number, number, number];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59) return null;
  const publicado = hojeEmSaoPaulo(new Date(publicadoEm));
  let ano = m[3] ? Number(m[3]) : Number(publicado.slice(0, 4));
  const data = (a: number) => `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  // Publicada em dezembro para uma live em janeiro: o ano é o seguinte.
  if (!m[3] && data(ano) < publicado && Number(publicado.slice(5, 7)) - mes >= 6) ano += 1;
  const instante = instanteEmSaoPaulo(ano, mes, dia, hora, minuto);
  return hojeEmSaoPaulo(instante) === data(ano) ? instante : null;
}

function linkDaLive(item: ItemTurma): Pick<LiveTurma, 'url' | 'tipoLink'> {
  const anexo = item.anexos.find((a) => a.tipo === 'youtube' || a.tipo === 'link');
  const url =
    anexo?.tipo === 'youtube'
      ? urlDoVideo(anexo.youtubeId)
      : anexo?.tipo === 'link'
        ? anexo.url
        : urlDoClassroom((item.descricao.match(RE_URL) ?? [])[0]?.replace(/[.,;:!?]+$/, ''));
  if (!url) return { url: null, tipoLink: null };
  return { url, tipoLink: extrairIdYoutube(url) ? 'youtube' : 'sala' };
}

export const ehLive = (item: Pick<ItemTurma, 'titulo'>): boolean =>
  RE_TITULO_LIVE.test(item.titulo) && !RE_GRAVACAO.test(item.titulo);

/** Lives que ainda não terminaram (a que está acontecendo aparece), da mais próxima para a mais distante. */
export function proximasLives(itens: readonly ItemTurma[], agora: Date, limite = 3): LiveTurma[] {
  return itens
    .filter(ehLive)
    .flatMap((item) => {
      const inicio = dataDaLive(item.titulo, item.publicadoEm);
      if (!inicio || inicio.getTime() + DURACAO_LIVE_MS <= agora.getTime()) return [];
      return [
        {
          itemId: item.id,
          titulo: item.titulo,
          inicio: inicio.toISOString(),
          fim: new Date(inicio.getTime() + DURACAO_LIVE_MS).toISOString(),
          ...linkDaLive(item),
        },
      ];
    })
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.itemId.localeCompare(b.itemId))
    .slice(0, limite);
}

/* ---------- Datas com horário (sempre em São Paulo) ---------- */

const formatoHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_PROGRAMA, hour: '2-digit', minute: '2-digit' });
const formatoSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_PROGRAMA, weekday: 'short' });
const formatoSemanaExtenso = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_PROGRAMA, weekday: 'long' });

const diaSP = (iso: string) => hojeEmSaoPaulo(new Date(iso));

/** Só a data: `12/11` (ou `12/11/2027`, se o ano for diferente do de `hoje`). */
export function formatarDia(iso: string, hoje: string): string {
  const [ano, mes, dia] = diaSP(iso).split('-');
  return ano === hoje.slice(0, 4) ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

/** `2026-11-12T23:59:00-03:00` → `qui., 12/11, 23:59`. */
export function formatarDataHora(iso: string, hoje: string): string {
  return `${formatoSemana.format(new Date(iso))}, ${formatarDia(iso, hoje)}, ${formatoHora.format(new Date(iso))}`;
}

export interface HorarioLive {
  /** Dia do início em São Paulo (`YYYY-MM-DD`), para comparar com `hoje`. */
  dia: string;
  selo: DataDestaque;
  /** `Quarta-feira`, ou `Hoje`. */
  quando: string;
  /** `19:30` */
  hora: string;
}

export function horarioDaLive(inicio: string, hoje: string): HorarioLive {
  const dia = diaSP(inicio);
  const semana = formatoSemanaExtenso.format(new Date(inicio));
  return {
    dia,
    selo: dataDestaque(dia),
    quando: dia === hoje ? 'Hoje' : semana.charAt(0).toUpperCase() + semana.slice(1),
    hora: formatoHora.format(new Date(inicio)),
  };
}

/* ---------- Texto das descrições ---------- */

export type TrechoTexto = { texto: string } | { url: string };

/** Descrição em texto puro → linhas (sem as vazias), com os links https clicáveis. */
export function linhasDaDescricao(descricao: string): TrechoTexto[][] {
  return descricao
    .split(/\r?\n/)
    .map((linha) => {
      const trechos: TrechoTexto[] = [];
      let resto = 0;
      for (const m of linha.matchAll(RE_URL)) {
        const url = m[0].replace(/[.,;:!?]+$/, '');
        const inicio = m.index ?? 0;
        if (inicio > resto) trechos.push({ texto: linha.slice(resto, inicio) });
        const segura = urlDoClassroom(url);
        trechos.push(segura ? { url: segura } : { texto: url });
        resto = inicio + url.length;
      }
      if (resto < linha.length) trechos.push({ texto: linha.slice(resto) });
      return trechos;
    })
    .filter((linha) => linha.some((t) => ('texto' in t ? t.texto.trim() : true)));
}

/** Descrições acima disso ficam recolhidas no cartão do item. */
export const LIMITE_DESCRICAO_ABERTA = 240;
