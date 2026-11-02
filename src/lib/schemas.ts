/**
 * Primitivas de schema independentes do runtime do Astro (testáveis com Vitest).
 * Os schemas das coleções, que dependem de `image()` e `reference()`, ficam em
 * `src/content.config.ts`.
 */
import { z } from 'astro/zod';
import { ehDataCalendario, normalizarDataCalendario } from './datas';
import type { Cronograma } from './status';

/** Painéis de formulário costumam gravar `""` ou `null` em campos opcionais vazios. */
const vazioParaUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(vazioParaUndefined, schema.optional());

export const texto = z.string().trim().min(1, 'Campo obrigatório');

export const listaDeTextos = z.preprocess(
  (v) => (v === null || v === undefined ? [] : v),
  z.array(texto),
);

export const urlHttps = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https$/, error: 'Use uma URL válida começando com https://' }));

export const dataCalendario = z.preprocess(
  normalizarDataCalendario,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
    .refine(ehDataCalendario, 'Data inexistente no calendário'),
);

/**
 * Ex.: `M26-01`: "M", ano do início da realização com 2 dígitos, traço e sequência da mentoria
 * no ano, a partir de 01 (reinicia a cada ano). O ano é conferido por `validarCodigo`.
 */
export const codigoMentoria = z
  .string()
  .trim()
  .regex(/^M\d{2}-(?!00)\d{2}$/, 'Código no formato M<ano>-<sequência>, ex.: M26-01');

/** `M26-01` → `m26-01` (usado na URL `/mentorias/[codigo]`). */
export function slugDoCodigo(codigo: string): string {
  return codigo.trim().toLowerCase();
}

/**
 * Códigos repetidos entre arquivos de mentoria (`caminho → texto do arquivo`). Lê o `codigo`
 * direto do frontmatter, porque a coleção já chega deduplicada pelo id.
 */
export function codigosDuplicados(
  arquivos: Record<string, string>,
): Array<{ codigo: string; arquivos: string[] }> {
  const porSlug = new Map<string, { codigo: string; arquivos: string[] }>();
  for (const [caminho, texto] of Object.entries(arquivos)) {
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto)?.[1] ?? '';
    const codigo = /^codigo:[ \t]*["']?([^"'\s#]+)/m.exec(frontmatter)?.[1];
    if (!codigo) continue;
    const grupo = porSlug.get(slugDoCodigo(codigo)) ?? { codigo, arquivos: [] };
    grupo.arquivos.push(caminho.replace(/^.*\//, ''));
    porSlug.set(slugDoCodigo(codigo), grupo);
  }
  return [...porSlug.values()].filter((g) => g.arquivos.length > 1);
}

/** O ano do código (`M26-…`) é o ano de `realizacao.inicio` (seção 6.2). */
export function validarCodigo(
  m: { codigo: string; realizacao: { inicio: string } },
  ctx: z.RefinementCtx,
): void {
  const anoCodigo = m.codigo.slice(1, 3);
  const anoInicio = m.realizacao.inicio.slice(2, 4);
  if (anoCodigo !== anoInicio) {
    ctx.addIssue({
      code: 'custom',
      path: ['codigo'],
      message: `o ano do código (${m.codigo}) deve ser o do início da realização (${m.realizacao.inicio}): use M${anoInicio}-<sequência>`,
    });
  }
}

/**
 * Id de uma referência entre coleções. O Pages CMS grava o nome do arquivo (`fulano.yaml`) e não
 * oferece token sem extensão; o Astro identifica a entrada sem ela (`fulano`). Aceita também o
 * caminho completo (`src/content/mentores/fulano.yaml`) e o id puro, escrito à mão.
 */
export function idDeReferencia(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  return valor.trim().replace(/^.*\//, '').replace(/\.(ya?ml|md)$/i, '');
}

/** Envolve um `reference()` do Astro para aceitar o valor gravado pelo painel. */
export const referenciaDoPainel = <T extends z.ZodType>(schema: T) => z.preprocess(idDeReferencia, schema);

/**
 * Id de uma entrada cujo arquivo pode começar por um número para ordenar a lista do painel
 * (`3-conteudo-pratico.yaml` → `conteudo-pratico`; `0-todos.yaml` → `todos`). Usado em eixos e cursos.
 */
export function idSemNumero(valor: unknown): unknown {
  const id = idDeReferencia(valor);
  return typeof id === 'string' ? id.replace(/^\d+-/, '') : id;
}

/** Referência vinda do painel, com ou sem o número na frente do arquivo (eixos e cursos). */
export const referenciaNumerada = <T extends z.ZodType>(schema: T) => z.preprocess(idSemNumero, schema);

/** `classroomCourseId`: ID numérico da turma no Classroom. */
/**
 * ID numérico da turma a partir do link do Classroom. O código depois de `/c/` no endereço
 * (`https://classroom.google.com/c/Nzk3MjQ3MTM2OTYz`) é o próprio ID em Base64 (`797247136963`).
 * Aceita o link (com ou sem `/u/0/`, com ou sem parâmetros) ou só o código; devolve `null` se não
 * der um número.
 */
export function idDoLinkDaTurma(valor: string): string | null {
  const codigo = /classroom\.google\.com\/(?:u\/\d+\/)?c\/([A-Za-z0-9_-]+)/.exec(valor)?.[1] ?? valor;
  if (!/^[A-Za-z0-9_-]+$/.test(codigo)) return null;
  try {
    const base64 = codigo.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(codigo.length / 4) * 4, '=');
    const id = atob(base64);
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * `classroomCourseId`: ID numérico da turma. No painel pode-se colar o link da turma; o build
 * converte para o número.
 */
export const idTurmaClassroom = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return /^\d+$/.test(t) ? t : (idDoLinkDaTurma(t) ?? t);
  },
  z.string().regex(/^\d+$/, 'Cole o link da turma no Classroom (classroom.google.com/c/…) ou o ID numérico'),
);

export const cronograma = z.object({
  inscricoes: z.object({ abertura: dataCalendario, fechamento: dataCalendario }),
  realizacao: z.object({ inicio: dataCalendario, fim: dataCalendario }),
});

/** Garante `abertura <= fechamento <= inicio <= fim` (seção 6.2). */
export function validarCronograma(c: Cronograma, ctx: z.RefinementCtx): void {
  const sequencia: Array<[string, string, (string | number)[]]> = [
    [c.inscricoes.abertura, c.inscricoes.fechamento, ['inscricoes', 'fechamento']],
    [c.inscricoes.fechamento, c.realizacao.inicio, ['realizacao', 'inicio']],
    [c.realizacao.inicio, c.realizacao.fim, ['realizacao', 'fim']],
  ];
  const nomes = ['abertura das inscrições', 'fechamento das inscrições', 'início', 'fim'];
  sequencia.forEach(([antes, depois, path], i) => {
    if (antes > depois) {
      ctx.addIssue({
        code: 'custom',
        path,
        message: `${nomes[i + 1]} (${depois}) não pode ser antes de ${nomes[i]} (${antes})`,
      });
    }
  });
}

/**
 * Objeto opcional vindo do painel: sem nenhum valor preenchido (`{}`, `{ media: null }`, `""`),
 * é tratado como ausente. Formulários costumam gravar o grupo vazio.
 */
export function semValores(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === '') return true;
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.values(valor).every(semValores);
  return false;
}

export const grupoOpcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (semValores(v) ? undefined : v), schema.optional());

const contagem = (campo: string) =>
  z.number(`${campo}: informe um número`).int(`${campo}: use um número inteiro`).min(0, `${campo}: não pode ser negativo`);

/**
 * Resultado da turma (preenchido no painel depois das inscrições e ao fim da mentoria).
 * Só números agregados e depoimentos autorizados: nenhum dado pessoal além do nome que o aluno
 * autorizou (seção 10 da spec).
 */
export const resultadoTurma = grupoOpcional(
  z
    .object({
      inscritos: opcional(contagem('inscritos')),
      concluintes: opcional(contagem('concluintes')),
      avaliacao: grupoOpcional(
        z.object({
          media: z.number('média da avaliação: informe um número').min(1, 'média da avaliação: de 1 a 5').max(5, 'média da avaliação: de 1 a 5'),
          respostas: contagem('respostas da avaliação').min(1, 'respostas da avaliação: ao menos 1'),
        }),
      ),
      depoimentos: z.preprocess(
        (v) => (Array.isArray(v) ? v.filter((d) => !semValores(d)) : v === null || v === undefined ? [] : v),
        z.array(
          z.object({
            texto: texto.pipe(z.string().max(280, 'depoimento: até 280 caracteres')),
            autor: texto,
            autorizado: z.preprocess(
              (v) => v ?? false,
              z.literal(true, 'depoimento sem autorização do aluno: marque "O aluno autorizou a publicação" ou remova o depoimento'),
            ),
          }),
        ),
      ),
    })
    .superRefine((r, ctx) => {
      if (r.inscritos !== undefined && r.concluintes !== undefined && r.concluintes > r.inscritos) {
        ctx.addIssue({ code: 'custom', path: ['concluintes'], message: `concluintes (${r.concluintes}) não pode passar de inscritos (${r.inscritos})` });
      }
      if (r.inscritos !== undefined && r.avaliacao && r.avaliacao.respostas > r.inscritos) {
        ctx.addIssue({
          code: 'custom',
          path: ['avaliacao', 'respostas'],
          message: `respostas da avaliação (${r.avaliacao.respostas}) não pode passar de inscritos (${r.inscritos})`,
        });
      }
    }),
);

/**
 * Lista vinda do painel sem os itens vazios: o Pages CMS grava `""` (ou um objeto sem valores)
 * quando se adiciona um item e não se preenche.
 */
/** Como `semValores`, mas uma lista só com itens vazios (`['']`) também conta como vazia. */
const vazioProfundo = (v: unknown): boolean =>
  Array.isArray(v) ? v.every(vazioProfundo) : typeof v === 'object' && v !== null ? Object.values(v).every(vazioProfundo) : semValores(v);

/** Grupo opcional da página do eixo: vazio (inclusive com listas de itens vazios) = ausente. */
const grupoDoEixo = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (vazioProfundo(v) ? undefined : v), schema.optional());

const semItensVazios = (v: unknown) =>
  Array.isArray(v) ? v.filter((i) => !vazioProfundo(i)) : v === null || v === undefined ? [] : v;

export const listaSemVazios = <T extends z.ZodType>(item: T, minimo = 0, mensagem = '') =>
  z.preprocess(semItensVazios, z.array(item).min(minimo, mensagem));

/** Itens de uma lista com título (ex.: competências técnicas): ao menos um item. */
const itensObrigatorios = (campo: string) => listaSemVazios(texto, 1, `${campo}: inclua ao menos um item`);

/**
 * Texto com lista (página do eixo): introdução, itens e fechamento, todos opcionais, mas com
 * introdução ou itens. Grupo vazio = ausente (a seção não aparece).
 */
export const textoComLista = (campo: string) =>
  grupoDoEixo(
    z
      .object({
        introducao: opcional(texto),
        itens: listaSemVazios(texto),
        fechamento: opcional(texto),
      })
      .refine((b) => b.introducao !== undefined || b.itens.length > 0, `${campo}: preencha a introdução ou ao menos um item`),
  );

/** Grupos com título e itens (competências por tipo; público-alvo por perfil). */
export const gruposDeItens = (campo: string, minimo = 0) =>
  listaSemVazios(
    z.object({ titulo: texto, itens: itensObrigatorios(`${campo} (cada grupo)`) }),
    minimo,
    `${campo}: inclua ao menos um grupo`,
  );

/**
 * Conteúdo da página do eixo (Q-13), migrado do site antigo. Tudo opcional: um eixo novo pode ser
 * cadastrado só com o básico, e cada seção da página só aparece se estiver preenchida.
 */
export const conteudoEixo = {
  objetivo: opcional(texto),
  apresentacao: textoComLista('apresentação'),
  competencias: gruposDeItens('competências'),
  cenario: textoComLista('cenário prático'),
  aprendizagem: grupoDoEixo(
    z.object({ itens: itensObrigatorios('aprendizagem'), fechamento: opcional(texto) }),
  ),
  publico: grupoDoEixo(
    z.object({
      grupos: gruposDeItens('público-alvo', 1),
      observacao: opcional(texto),
    }),
  ),
  perfil: listaSemVazios(texto),
};
