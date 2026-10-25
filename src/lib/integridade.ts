import { getCollection, getEntry } from 'astro:content';
import { codigosDuplicados } from './schemas';

/** Texto bruto dos arquivos de mentoria, só para detectar códigos repetidos. */
const arquivosMentorias = import.meta.glob<string>('../content/mentorias/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * O Astro só registra referências quebradas como erro de log, sem falhar o build.
 * A spec exige o contrário (seção 6.2): referência a eixo, mentor ou selo inexistente
 * precisa impedir o deploy. Também falha com dois arquivos de mesmo código: como o id vem
 * do código, o Astro manteria só um deles, sem aviso. Executado uma única vez por build.
 */
async function verificar(): Promise<void> {
  const problemas: string[] = codigosDuplicados(arquivosMentorias).map(
    ({ codigo, arquivos }) => `código ${codigo} usado em mais de um arquivo: ${arquivos.join(', ')}`,
  );
  for (const m of await getCollection('mentorias')) {
    for (const ref of [...m.data.eixos, ...m.data.mentores, ...m.data.selos]) {
      if (!(await getEntry(ref))) {
        problemas.push(`mentoria "${m.id}" referencia ${ref.collection}/"${ref.id}", que não existe`);
      }
    }
  }
  if (problemas.length > 0) {
    throw new Error(`Conteúdo inconsistente:\n- ${problemas.join('\n- ')}`);
  }
}

let execucao: Promise<void> | undefined;

export function verificarIntegridade(): Promise<void> {
  execucao ??= verificar();
  return execucao;
}
