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

/** `classroomCourseId`: ID numérico da turma no Classroom. */
export const idTurmaClassroom = z.string().trim().regex(/^\d+$/, 'ID da turma deve ser numérico');

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
