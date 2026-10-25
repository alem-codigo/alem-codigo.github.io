import type { ItemNavegacao } from './navegacao';

export const SITE = {
  nome: 'Além do Código',
  descricao: 'Programa de mentorias em tecnologia para estudantes e egressos do Cluster de TI da UniCesumar EaD.',
  /** Texto obrigatório no rodapé: o programa não é gerido pela instituição (D-03). */
  vinculo: 'Projeto do Cluster de TI da UniCesumar EaD, mantido de forma independente.',
} as const;

/** Links do rodapé, agrupados. */
export const RODAPE: readonly { titulo: string; itens: readonly ItemNavegacao[] }[] = [
  {
    titulo: 'Programa',
    itens: [
      { rotulo: 'Sobre', href: '/sobre' },
      { rotulo: 'Como participar', href: '/como-participar' },
      { rotulo: 'Eixos', href: '/eixos' },
    ],
  },
  {
    titulo: 'Mentorias',
    itens: [
      { rotulo: 'Todas as mentorias', href: '/mentorias' },
      { rotulo: 'Mentores', href: '/mentores' },
    ],
  },
];

/**
 * Canais oficiais (YouTube, Substack etc.). A coluna "Canais" do rodapé só aparece quando
 * houver ao menos um. Use sempre URLs https completas.
 */
export const CANAIS: readonly ItemNavegacao[] = [
  { rotulo: 'YouTube', href: 'https://www.youtube.com/@alemdocodigo-mentoria' },
  { rotulo: 'Newsletter (Substack)', href: 'https://alemcodigo.substack.com/' },
];
