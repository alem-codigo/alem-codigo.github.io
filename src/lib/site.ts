import type { ItemNavegacao } from './navegacao';

export const SITE = {
  nome: 'Além do Código',
  descricao: 'Programa de mentorias em tecnologia para estudantes do Cluster de TI da UniCesumar EaD.',
  /** Texto obrigatório no rodapé: o programa não é gerido pela instituição (D-03). */
  vinculo: 'Projeto do Cluster de TI da UniCesumar EaD, mantido de forma independente.',
  /**
   * Indexação pelos buscadores. `false` até o lançamento (Fase 3): todas as páginas saem com
   * `noindex`. A prévia dos links (Open Graph) funciona mesmo assim, porque WhatsApp, LinkedIn e
   * Facebook leem as meta tags sem respeitar o `noindex`; o robots.txt continua liberado.
   */
  indexar: false,
  /**
   * Verificação de `alem-codigo.github.io` no Google Search Console (conta do programa), exigida
   * para a verificação da marca do app do Google (8.1). Código público; não remover depois de
   * verificado, senão o Google desfaz a verificação.
   */
  verificacaoGoogle: 'cxWI4q2d3-z98RUC4vI1bikNOEhLiG0Y773Y1xUm7uI',
} as const;

/**
 * Formulário "me avise" da página da mentoria (D-19): um Google Forms único, que recebe o e-mail
 * e a mentoria sem sair do site. Enquanto for `null`, o campo não aparece.
 *
 * Como preencher: no Forms, crie as perguntas (resposta curta "Mentoria", resposta curta
 * "E-mail", resposta curta "Situação da mentoria" e caixa de seleção com o texto de
 * `consentimento`), sem exigir login nem coletar e-mail automaticamente. A data e a hora de cada
 * pedido ficam na coluna "Carimbo de data/hora" que o próprio Forms grava na planilha. Em "Gerar link pré-preenchido", copie os `entry.<número>` de cada
 * pergunta. `acao` é o endereço do formulário com `/viewform` trocado por `/formResponse`.
 */
export const FORM_AVISO: {
  acao: string;
  /** `situacao` é opcional: status da mentoria quando a pessoa pediu o aviso (ex.: "Encerrada"). */
  campos: { mentoria: string; email: string; consentimento: string; situacao?: string };
  /** Texto exato da opção da caixa de seleção no Forms (o Google só aceita se for igual). */
  consentimento: string;
} | null = {
  // Formulário "Além do Código · Aviso de novas turmas" (conta do programa). Ids de "Preencher
  // formulário automaticamente"; se as perguntas forem recriadas no Forms, os números mudam.
  acao: 'https://docs.google.com/forms/d/e/1FAIpQLSdQ8kMmhD0T0WYgP9t9lU0Mbr1WMFrmAOLDJ-P0mNHEdsTzkQ/formResponse',
  campos: {
    mentoria: 'entry.570155093',
    situacao: 'entry.1574832453',
    email: 'entry.1475928196',
    consentimento: 'entry.1578459936',
  },
  consentimento:
    'Autorizo o programa Além do Código a usar meu e-mail somente para me avisar sobre novas turmas de mentorias. Sei que posso pedir a exclusão do meu e-mail a qualquer momento.',
};

/**
 * Contato do programa (conta Google do programa, não institucional: D-03). Usado em
 * /como-participar para quem não recebeu o convite da turma ou informou o e-mail errado.
 */
export const CONTATO = { email: 'alemdocodigo.clusterti@gmail.com' } as const;

/**
 * Contato de empresas em /parcerias/ (D-36): o e-mail do programa com `+parcerias` (o Gmail
 * entrega na mesma caixa) e o assunto com "[Parceria]", que os filtros da conta do programa usam
 * para encaminhar aos idealizadores. Mudou o endereço ou o prefixo? Ajuste os filtros (seção 12).
 */
export const CONTATO_PARCERIAS = {
  email: 'alemdocodigo.clusterti+parcerias@gmail.com',
  assunto: '[Parceria] Interesse em conduzir uma mentoria',
  corpo: [
    'Olá, equipe do Além do Código!',
    '',
    'Empresa:',
    'Nome e cargo:',
    'Tema ou área de interesse:',
    'Site da empresa:',
    '',
    'Mensagem:',
    '',
  ].join('\r\n'),
} as const;

/** Frase em marca d'água da cena da montanha, no fim da home (provisória: slogan ainda não definido). */
export const SLOGAN = 'Cada passo conta.';

/** Links do rodapé, agrupados. */
export const RODAPE: readonly { titulo: string; itens: readonly ItemNavegacao[] }[] = [
  {
    titulo: 'Programa',
    itens: [
      { rotulo: 'Sobre', href: '/sobre/' },
      { rotulo: 'Como participar', href: '/como-participar/' },
      { rotulo: 'Eixos', href: '/eixos/' },
      { rotulo: 'Parcerias', href: '/parcerias/' },
      { rotulo: 'Privacidade', href: '/privacidade/' },
    ],
  },
  {
    titulo: 'Mentorias',
    itens: [
      { rotulo: 'Todas as mentorias', href: '/mentorias/' },
      { rotulo: 'Mentores', href: '/mentores/' },
    ],
  },
];

/**
 * Canais oficiais (YouTube, Substack etc.). A coluna "Canais" do rodapé só aparece quando
 * houver ao menos um. Use sempre URLs https completas.
 */
/** Newsletter do programa (Substack): aviso geral de novas mentorias enquanto não houver FORM_AVISO. */
export const NEWSLETTER = 'https://alemcodigo.substack.com/';

export const CANAIS: readonly ItemNavegacao[] = [
  { rotulo: 'YouTube', href: 'https://www.youtube.com/@alemdocodigo-mentoria' },
  { rotulo: 'Newsletter (Substack)', href: NEWSLETTER },
];

/**
 * Portal da turma (D-34): client ID OAuth "Aplicativo da Web" do projeto do Google Cloud da conta
 * do programa, com as origens `https://alem-codigo.github.io` e `http://localhost:4321`. O client
 * ID é público por natureza (não há segredo). Enquanto for `null`, o botão "Acessar a turma" da
 * página da mentoria só abre a turma no Classroom.
 */
export const PORTAL_CLASSROOM: { clientId: string } | null = {
  // Projeto "Além do Código – Portal" (conta do programa), cliente "Site Além do Código (web)".
  clientId: '478914339004-g05gc8gid48m1nlglnopsdet8cnm81so.apps.googleusercontent.com',
};
