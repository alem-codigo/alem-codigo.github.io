/**
 * Índice "Nesta página" (/como-participar, /privacidade): ao rolar, marca o link da seção que está
 * sendo lida com `aria-current="location"`, que tem o mesmo estilo do hover. A seção ativa é a
 * última cujo topo já passou da linha de leitura (30% da altura da janela, abaixo do cabeçalho
 * fixo); no fim da página, a última. Antes do primeiro título, nenhuma.
 */

/** Fração da altura da janela onde fica a linha de leitura. */
export const LINHA_DE_LEITURA = 0.3;

/**
 * Índice da seção ativa a partir do topo de cada seção (em px, relativo à janela, na ordem do
 * índice), ou `-1` antes da primeira. Pura, testada em indiceAtivo.test.ts.
 */
export function secaoAtiva(topos: readonly number[], linha: number, noFim: boolean): number {
  if (topos.length === 0) return -1;
  if (noFim) return topos.length - 1;
  let ativa = -1;
  topos.forEach((topo, i) => {
    if (topo <= linha) ativa = i;
  });
  return ativa;
}

export function acompanharIndice(nav: HTMLElement): void {
  const pares = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
    const alvo = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return alvo ? [{ link, alvo }] : [];
  });
  if (pares.length === 0) return;

  let atual: HTMLAnchorElement | null = null;
  let agendado = false;

  const atualizar = () => {
    agendado = false;
    const raiz = document.documentElement;
    const noFim = window.scrollY > 0 && window.innerHeight + window.scrollY >= raiz.scrollHeight - 2;
    const i = secaoAtiva(
      pares.map((p) => p.alvo.getBoundingClientRect().top),
      window.innerHeight * LINHA_DE_LEITURA,
      noFim,
    );
    const link = pares[i]?.link ?? null;
    if (link === atual) return;
    atual?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', 'location');
    atual = link;
  };

  const agendar = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(atualizar);
  };

  addEventListener('scroll', agendar, { passive: true });
  addEventListener('resize', agendar, { passive: true });
  atualizar();
}
