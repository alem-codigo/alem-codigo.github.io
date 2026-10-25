import { ehDataCalendario } from './datas';

export const STATUS_MENTORIA = [
  'em-breve',
  'inscricoes-abertas',
  'inscricoes-encerradas',
  'em-andamento',
  'encerrada',
] as const;

export type StatusMentoria = (typeof STATUS_MENTORIA)[number];

export const ROTULO_STATUS: Record<StatusMentoria, string> = {
  'em-breve': 'Em breve',
  'inscricoes-abertas': 'Inscrições abertas',
  'inscricoes-encerradas': 'Inscrições encerradas',
  'em-andamento': 'Em andamento',
  encerrada: 'Encerrada',
};

export interface Cronograma {
  inscricoes: { abertura: string; fechamento: string };
  realizacao: { inicio: string; fim: string };
}

/**
 * Status calculado (seção 6.3). `hoje` é a data de calendário de São Paulo.
 * As regras são avaliadas na ordem da tabela: se `fechamento` coincidir com `inicio`,
 * nesse dia vale `inscricoes-abertas`.
 */
export function calcularStatus(c: Cronograma, hoje: string): StatusMentoria {
  if (!ehDataCalendario(hoje)) {
    throw new RangeError(`"hoje" deve ser uma data YYYY-MM-DD válida; recebido: ${hoje}`);
  }
  if (hoje < c.inscricoes.abertura) return 'em-breve';
  if (hoje <= c.inscricoes.fechamento) return 'inscricoes-abertas';
  if (hoje < c.realizacao.inicio) return 'inscricoes-encerradas';
  if (hoje <= c.realizacao.fim) return 'em-andamento';
  return 'encerrada';
}

/** Variante de card por status (Q-08). O grafite (encerrada) é recuado e não tem ação principal. */
export type VarianteCard = 'padrao' | 'violeta' | 'grafite';

export const VARIANTE_CARD: Record<StatusMentoria, VarianteCard> = {
  'em-breve': 'padrao',
  'inscricoes-abertas': 'violeta',
  'inscricoes-encerradas': 'padrao',
  'em-andamento': 'padrao',
  encerrada: 'grafite',
};

/**
 * Status que mostram pílula no card. A encerrada não tem pílula: fica numa seção própria
 * de mentorias encerradas, com o card grafite.
 */
export const STATUS_COM_PILULA = STATUS_MENTORIA.filter(
  (s): s is Exclude<StatusMentoria, 'encerrada'> => s !== 'encerrada',
);

export const temPilula = (s: StatusMentoria): s is Exclude<StatusMentoria, 'encerrada'> => s !== 'encerrada';

export const inscricoesAbertas = (c: Cronograma, hoje: string): boolean =>
  calcularStatus(c, hoje) === 'inscricoes-abertas';
