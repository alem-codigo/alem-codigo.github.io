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

/** Ex.: `M1.26A`. */
export const codigoMentoria = z
  .string()
  .trim()
  .regex(/^M\d+\.\d{2}[A-Z]$/, 'Código no formato M<n>.<ano><turma>, ex.: M1.26A');

/** `M1.26A` → `m1-26a` (usado na URL `/mentorias/[codigo]`). */
export function slugDoCodigo(codigo: string): string {
  return codigo.trim().toLowerCase().replace(/\./g, '-');
}

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
