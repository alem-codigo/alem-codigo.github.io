/**
 * Página /parcerias/ (D-36): parcerias derivadas do cadastro das mentorias (grupo `parceiro`), sem
 * coleção própria, e o link de contato por e-mail. Funções puras, testadas em parcerias.test.ts.
 */
import { MIN_RESPOSTAS_AVALIACAO, slugParceiro, type ResultadoTurma } from './mentorias';

/** O mínimo de uma mentoria que a página usa. `L` é o tipo da logo (imagem do Astro nos testes, qualquer coisa). */
export interface MentoriaDeParceria<L> {
  id: string;
  codigo: string;
  titulo: string;
  realizacao: { inicio: string; fim: string };
  parceiro?: { nome: string; logo: L; logoEscura?: L; url: string; exibirEmParcerias: boolean };
  resultado?: ResultadoTurma;
}

export interface Parceria<L> {
  /** Valor do filtro da listagem (`/mentorias/?parceria=<slug>`). */
  slug: string;
  nome: string;
  url: string;
  logo: L;
  logoEscura?: L;
  /** Da mais recente para a mais antiga (pelo início da realização). */
  mentorias: { id: string; codigo: string; titulo: string; inicio: string; fim: string }[];
  /** Somas das turmas que informaram o número; `undefined` se nenhuma informou. */
  inscritos?: number;
  concluintes?: number;
  /** Média ponderada pelas respostas, só com o mínimo de respostas somadas (D-26). */
  avaliacao?: { media: number; respostas: number };
}

const somar = (valores: (number | undefined)[]): number | undefined => {
  const informados = valores.filter((v): v is number => v !== undefined);
  return informados.length > 0 ? informados.reduce((a, b) => a + b, 0) : undefined;
};

/**
 * Agrupa as mentorias com parceiro pela empresa. O nome é comparado sem acentos, caixa e espaços
 * (`slugParceiro`), para "TCS" e "tcs " virarem a mesma parceria; nome, logo e site vêm da
 * mentoria mais recente (o cadastro pode ter mudado). Parcerias da mais recente para a mais antiga.
 *
 * Só entram as empresas que autorizaram aparecer na página: basta a marcação em uma mentoria da
 * empresa (D-36). Os números e a lista de mentorias continuam incluindo todas as turmas dela.
 */
export function parceriasDoCadastro<L>(lista: readonly MentoriaDeParceria<L>[]): Parceria<L>[] {
  const grupos = new Map<string, MentoriaDeParceria<L>[]>();
  for (const m of lista) {
    if (!m.parceiro) continue;
    const slug = slugParceiro(m.parceiro.nome);
    if (!slug) continue;
    grupos.set(slug, [...(grupos.get(slug) ?? []), m]);
  }

  const autorizadas = [...grupos].filter(([, ms]) => ms.some((m) => m.parceiro!.exibirEmParcerias));

  const parcerias = autorizadas.map(([slug, ms]): Parceria<L> => {
    const ordenadas = [...ms].sort(
      (a, b) => b.realizacao.inicio.localeCompare(a.realizacao.inicio) || b.codigo.localeCompare(a.codigo),
    );
    const recente = ordenadas[0]!;
    const parceiro = recente.parceiro!;

    const avaliacoes = ordenadas.flatMap((m) => (m.resultado?.avaliacao ? [m.resultado.avaliacao] : []));
    const respostas = avaliacoes.reduce((s, a) => s + a.respostas, 0);
    const media =
      respostas > 0 ? Math.round((avaliacoes.reduce((s, a) => s + a.media * a.respostas, 0) / respostas) * 10) / 10 : 0;

    return {
      slug,
      nome: parceiro.nome.trim(),
      url: parceiro.url,
      logo: parceiro.logo,
      logoEscura: parceiro.logoEscura,
      mentorias: ordenadas.map((m) => ({
        id: m.id,
        codigo: m.codigo,
        titulo: m.titulo,
        inicio: m.realizacao.inicio,
        fim: m.realizacao.fim,
      })),
      inscritos: somar(ordenadas.map((m) => m.resultado?.inscritos)),
      concluintes: somar(ordenadas.map((m) => m.resultado?.concluintes)),
      avaliacao: respostas >= MIN_RESPOSTAS_AVALIACAO ? { media, respostas } : undefined,
    };
  });

  return parcerias.sort(
    (a, b) => b.mentorias[0]!.inicio.localeCompare(a.mentorias[0]!.inicio) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

export interface ContatoPorEmail {
  email: string;
  assunto: string;
  corpo: string;
}

/**
 * `mailto:` com assunto e corpo pré-preenchidos. `encodeURIComponent` em cada parte: sem ele, o
 * `+` vira espaço e as quebras de linha se perdem em alguns clientes de e-mail. O endereço fica
 * sem codificar (o `+parcerias` precisa chegar como está).
 */
export function linkMailto({ email, assunto, corpo }: ContatoPorEmail): string {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
