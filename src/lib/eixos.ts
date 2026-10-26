/**
 * Ícones disponíveis para os eixos (campo `icone` do cadastro, escolhido no painel).
 * Desenhos 24×24 em traço, no mesmo estilo dos ícones do "Como funciona".
 * Traçados adaptados do Lucide (https://lucide.dev, licença ISC).
 *
 * Para acrescentar um ícone: inclua-o aqui e na lista `values` do campo `icone` em `.pages.yml`
 * (o teste `eixos.test.ts` confere que as duas listas são iguais).
 */
export const ICONES_EIXO = {
  maleta: {
    rotulo: 'Maleta',
    d: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  },
  codigo: {
    rotulo: 'Código',
    d: 'm18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16',
  },
  livro: {
    rotulo: 'Livro aberto',
    d: 'M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z',
  },
  ferramenta: {
    rotulo: 'Chave inglesa',
    d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z',
  },
  capelo: {
    rotulo: 'Capelo de formatura',
    d: 'M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0ZM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5',
  },
  grafico: {
    rotulo: 'Gráfico subindo',
    d: 'M16 7h6v6M22 7l-8.5 8.5-5-5L2 17',
  },
} as const satisfies Record<string, { rotulo: string; d: string }>;

export type IconeEixo = keyof typeof ICONES_EIXO;

export const NOMES_ICONES_EIXO = Object.keys(ICONES_EIXO) as [IconeEixo, ...IconeEixo[]];
