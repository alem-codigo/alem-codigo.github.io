import { getCollection, getEntry } from 'astro:content';

/**
 * O Astro só registra referências quebradas como erro de log, sem falhar o build.
 * A spec exige o contrário (seção 6.2): referência a eixo ou mentor inexistente
 * precisa impedir o deploy. Executado uma única vez por build.
 */
async function verificar(): Promise<void> {
  const problemas: string[] = [];
  for (const m of await getCollection('mentorias')) {
    for (const ref of [...m.data.eixos, ...m.data.mentores]) {
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
