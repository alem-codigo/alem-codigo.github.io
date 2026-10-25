import { calcularStatus, type Cronograma } from './status';

export interface ItemNavegacao {
  rotulo: string;
  href: string;
}

/** Navegação principal (cabeçalho). As rotas seguem o mapa de páginas da spec (seção 7). */
export const NAVEGACAO_PRINCIPAL: readonly ItemNavegacao[] = [
  { rotulo: 'Mentorias', href: '/mentorias' },
  { rotulo: 'Eixos', href: '/eixos' },
  { rotulo: 'Mentores', href: '/mentores' },
  { rotulo: 'Como participar', href: '/como-participar' },
  { rotulo: 'Sobre', href: '/sobre' },
];

const semBarraFinal = (caminho: string): string =>
  caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;

/** O item está ativo na própria página e nas páginas abaixo dele (ex.: /mentorias/m1-26a). */
export function itemAtivo(caminhoAtual: string, href: string): boolean {
  const atual = semBarraFinal(caminhoAtual);
  const alvo = semBarraFinal(href);
  if (alvo === '/') return atual === '/';
  return atual === alvo || atual.startsWith(`${alvo}/`);
}

export interface MentoriaResumo extends Cronograma {
  id: string;
}

/**
 * Destino do botão "Inscrições abertas" do cabeçalho, ou `null` se nenhuma mentoria
 * estiver com inscrições abertas (o botão não aparece). Com uma só, leva direto a ela.
 */
export function destinoInscricoes(mentorias: readonly MentoriaResumo[], hoje: string): string | null {
  const abertas = mentorias.filter((m) => calcularStatus(m, hoje) === 'inscricoes-abertas');
  if (abertas.length === 0) return null;
  if (abertas.length === 1) return `/mentorias/${abertas[0]!.id}`;
  return '/mentorias#inscricoes-abertas';
}
