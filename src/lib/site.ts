import type { ItemNavegacao } from './navegacao';

export const SITE = {
  nome: 'Além do Código',
  descricao: 'Programa de mentorias em tecnologia para estudantes e egressos do Cluster de TI da UniCesumar EaD.',
  /** Texto obrigatório no rodapé: o programa não é gerido pela instituição (D-03). */
  vinculo: 'Projeto do Cluster de TI da UniCesumar EaD, mantido de forma independente.',
} as const;

/**
 * Formulário "me avise" da página da mentoria (D-19): um Google Forms único, que recebe o e-mail
 * e a mentoria sem sair do site. Enquanto for `null`, o campo não aparece.
 *
 * Como preencher: no Forms, crie as perguntas (resposta curta "Mentoria", resposta curta
 * "E-mail" e caixa de seleção com o texto de `consentimento`), sem exigir login nem coletar
 * e-mail automaticamente. Em "Gerar link pré-preenchido", copie os `entry.<número>` de cada
 * pergunta. `acao` é o endereço do formulário com `/viewform` trocado por `/formResponse`.
 */
export const FORM_AVISO: {
  acao: string;
  campos: { mentoria: string; email: string; consentimento: string };
  /** Texto exato da opção da caixa de seleção no Forms (o Google só aceita se for igual). */
  consentimento: string;
} | null = null;

/** Frase em marca d'água da cena da montanha, no fim da home (provisória: slogan ainda não definido). */
export const SLOGAN = 'Cada passo conta.';

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
