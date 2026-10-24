import { ehDataCalendario } from './datas';

export const STATUS_MENTORIA = [
  'em-breve',
  'inscricoes-abertas',
  'aguardando-inicio',
  'em-andamento',
  'encerrada',
] as const;

export type StatusMentoria = (typeof STATUS_MENTORIA)[number];

export const ROTULO_STATUS: Record<StatusMentoria, string> = {
  'em-breve': 'Em breve',
  'inscricoes-abertas': 'Inscrições abertas',
  'aguardando-inicio': 'Aguardando início',
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
  if (hoje < c.realizacao.inicio) return 'aguardando-inicio';
  if (hoje <= c.realizacao.fim) return 'em-andamento';
  return 'encerrada';
}

export const inscricoesAbertas = (c: Cronograma, hoje: string): boolean =>
  calcularStatus(c, hoje) === 'inscricoes-abertas';
