/**
 * Leitura da turma na API do Classroom, no navegador, com o token do aluno (D-34). O site não
 * guarda nada: cada visita busca de novo. `montarConteudo` (pura, testada) converte as respostas
 * no modelo do portal, com a mesma lista branca de tipos de anexo de apps-script/nucleo.js.
 */
import {
  extrairIdYoutube,
  urlSegura,
  type AnexoTurma,
  type ConteudoTurma,
  type ItemTurma,
} from './classroom';

/** Escopos pedidos no login: só leitura, sem agenda (D-34). */
export const ESCOPOS_CLASSROOM = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.topics.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
] as const;

/* ---------- Respostas da API (só os campos usados) ---------- */

interface DataApi {
  year?: number;
  month?: number;
  day?: number;
}

interface HoraApi {
  hours?: number;
  minutes?: number;
}

export interface MaterialApi {
  driveFile?: { driveFile?: { title?: string; alternateLink?: string } };
  youtubeVideo?: { id?: string; title?: string };
  link?: { url?: string; title?: string };
  form?: { title?: string; formUrl?: string };
}

export interface ItemApi {
  id?: string;
  title?: string;
  description?: string;
  topicId?: string;
  state?: string;
  alternateLink?: string;
  creationTime?: string;
  scheduledTime?: string;
  dueDate?: DataApi;
  dueTime?: HoraApi;
  materials?: MaterialApi[];
}

export interface CursoApi {
  id?: string;
  name?: string;
  alternateLink?: string;
}

export interface TopicoApi {
  topicId?: string;
  name?: string;
}

export interface TurmaApi {
  curso: CursoApi;
  topicos: TopicoApi[];
  atividades: ItemApi[];
  materiais: ItemApi[];
}

/* ---------- Conversão ---------- */

function montarAnexo(m: MaterialApi): AnexoTurma | null {
  if (m.youtubeVideo?.id && /^[A-Za-z0-9_-]{11}$/.test(m.youtubeVideo.id)) {
    return { tipo: 'youtube', titulo: m.youtubeVideo.title || 'Vídeo', youtubeId: m.youtubeVideo.id };
  }
  const arquivo = m.driveFile?.driveFile;
  if (arquivo) {
    const url = urlSegura(arquivo.alternateLink);
    return url ? { tipo: 'drive', titulo: arquivo.title || 'Arquivo do Drive', url } : null;
  }
  if (m.form) {
    const url = urlSegura(m.form.formUrl);
    return url ? { tipo: 'form', titulo: m.form.title || 'Formulário', url } : null;
  }
  if (m.link) {
    const url = urlSegura(m.link.url);
    if (!url) return null;
    const id = extrairIdYoutube(url);
    if (id) return { tipo: 'youtube', titulo: m.link.title || 'Vídeo', youtubeId: id };
    return { tipo: 'link', titulo: m.link.title || url, url };
  }
  // Tipos desconhecidos (ou novos na API) ficam de fora.
  return null;
}

/** Prazo da atividade: `dueDate` + `dueTime` vêm em UTC; campos zerados são omitidos pela API. */
function prazo(a: ItemApi): string | null {
  const d = a.dueDate;
  if (!d?.year || !d.month || !d.day) return null;
  const t = a.dueTime ?? {};
  return new Date(Date.UTC(d.year, d.month - 1, d.day, t.hours ?? 0, t.minutes ?? 0)).toISOString();
}

function montarItem(bruto: ItemApi, tipo: ItemTurma['tipo'], topicos: Set<string>): ItemTurma | null {
  const publicado = bruto.scheduledTime || bruto.creationTime;
  if (!bruto.id || !publicado || (bruto.state && bruto.state !== 'PUBLISHED')) return null;
  return {
    id: String(bruto.id),
    tipo,
    titulo: bruto.title || 'Sem título',
    descricao: (bruto.description ?? '').replace(/\r\n?/g, '\n').trim(),
    topicoId: bruto.topicId && topicos.has(bruto.topicId) ? String(bruto.topicId) : null,
    publicadoEm: new Date(publicado).toISOString(),
    prazo: tipo === 'atividade' ? prazo(bruto) : null,
    anexos: (bruto.materials ?? []).map(montarAnexo).filter((a): a is AnexoTurma => a !== null),
    link: urlSegura(bruto.alternateLink),
  };
}

export function montarConteudo(t: TurmaApi, courseId: string, linkPadrao: string): ConteudoTurma {
  // A API devolve os tópicos na ordem em que aparecem no Classroom; essa é a `ordem`.
  const topicos = t.topicos
    .filter((x): x is TopicoApi & { topicId: string } => Boolean(x.topicId))
    .map((x, i) => ({ id: String(x.topicId), nome: x.name || 'Tópico', ordem: i }));
  const ids = new Set(topicos.map((x) => x.id));
  const itens = [
    ...t.atividades.map((a) => montarItem(a, 'atividade', ids)),
    ...t.materiais.map((m) => montarItem(m, 'material', ids)),
  ].filter((i): i is ItemTurma => i !== null);
  return {
    courseId,
    nome: t.curso.name ?? '',
    link: urlSegura(t.curso.alternateLink) ?? linkPadrao,
    topicos,
    itens,
  };
}

/* ---------- Chamadas ---------- */

export type MotivoErro = 'sessao' | 'sem-acesso' | 'rede' | 'api';

export class ErroTurma extends Error {
  constructor(
    readonly motivo: MotivoErro,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroTurma';
  }
}

const BASE = 'https://classroom.googleapis.com/v1/courses/';

async function chamar<T>(url: string, token: string, buscar: typeof fetch): Promise<T> {
  let resposta: Response;
  try {
    resposta = await buscar(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ErroTurma('rede', 'Sem conexão com o Google Classroom.');
  }
  if (resposta.status === 401) throw new ErroTurma('sessao', 'A sessão expirou.');
  // 403: conta sem acesso à turma (ou escopo negado); 404: a turma não existe para esta conta.
  if (resposta.status === 403 || resposta.status === 404) throw new ErroTurma('sem-acesso', 'Conta sem acesso à turma.');
  if (!resposta.ok) throw new ErroTurma('api', `Classroom respondeu ${resposta.status}.`);
  return (await resposta.json()) as T;
}

/** Lista paginada (`pageToken`), com teto de páginas por segurança. */
async function listar<T>(caminho: string, chave: string, token: string, buscar: typeof fetch): Promise<T[]> {
  const itens: T[] = [];
  let pagina: string | undefined;
  for (let i = 0; i < 20; i++) {
    const url = `${caminho}${caminho.includes('?') ? '&' : '?'}pageSize=100${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`;
    const r = await chamar<Record<string, unknown> & { nextPageToken?: string }>(url, token, buscar);
    itens.push(...((r[chave] as T[] | undefined) ?? []));
    pagina = r.nextPageToken;
    if (!pagina) break;
  }
  return itens;
}

export async function buscarTurma(courseId: string, token: string, buscar: typeof fetch = fetch): Promise<TurmaApi> {
  if (!/^\d+$/.test(courseId)) throw new ErroTurma('api', 'ID da turma inválido.');
  const base = `${BASE}${courseId}`;
  // O curso primeiro: sem acesso, falha aqui e não dispara as outras chamadas.
  const curso = await chamar<CursoApi>(base, token, buscar);
  const [topicos, atividades, materiais] = await Promise.all([
    listar<TopicoApi>(`${base}/topics`, 'topic', token, buscar),
    listar<ItemApi>(`${base}/courseWork`, 'courseWork', token, buscar),
    listar<ItemApi>(`${base}/courseWorkMaterials`, 'courseWorkMaterial', token, buscar),
  ]);
  return { curso, topicos, atividades, materiais };
}
