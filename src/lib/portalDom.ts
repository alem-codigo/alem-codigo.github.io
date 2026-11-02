/**
 * Montagem do portal no navegador (opção B): faixa com próximas lives, próximos prazos e a turma
 * no Classroom, e o cronograma por tópico. Todo texto entra por `textContent` e todo `href` passa
 * por `urlSegura` (só https), então nada do Classroom vira HTML. Estilos em PortalTurma.astro.
 */
import { hojeEmSaoPaulo } from './datas';
import {
  cronogramaPorTopico,
  formatarDataHora,
  formatarDia,
  horarioDaLive,
  LIMITE_DESCRICAO_ABERTA,
  linhasDaDescricao,
  proximasLives,
  proximosPrazos,
  urlDoVideo,
  urlSegura,
  type AnexoTurma,
  type ConteudoTurma,
  type ItemTurma,
} from './classroom';

type Filho = Node | string | null | undefined | false;
type Atributos = Record<string, string | boolean | undefined>;

function h(tag: string, attrs: Atributos = {}, ...filhos: Filho[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'href') {
      const interno = typeof v === 'string' && (v.startsWith('#') || /^\/(?![/\\])/.test(v));
      const url = interno ? (v as string) : urlSegura(v);
      if (url) el.setAttribute('href', url);
    } else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos) if (f) el.append(f);
  return el;
}

const NS = 'http://www.w3.org/2000/svg';

/** Ícones de traço (adaptados do Lucide, ISC). */
const ICONES = {
  live: 'M16 13l5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z',
  relogio: 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  turma: 'M2 3h20M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3M7 21l5-5 5 5',
  arquivo: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4',
  formulario:
    'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  externo: 'M7 17 17 7M9 7h8v8',
} as const;

function icone(nome: keyof typeof ICONES): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'portal-icone');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONES[nome]);
  svg.append(path);
  return svg as SVGSVGElement;
}

const oculto = (texto: string) => h('span', { class: 'visualmente-oculto' }, texto);
const novaAba = () => oculto(' (abre em nova aba)');
const tempo = (iso: string, texto: string) => h('time', { datetime: iso }, texto);

/* ---------- Vídeo leve ---------- */

/** Bloco no estilo da capa padrão; o clique troca pelo player (ver `ativarVideos`). */
function video(id: string, titulo: string): HTMLElement {
  const play = document.createElementNS(NS, 'svg');
  play.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M8 5.5v13l10.5-6.5Z');
  play.append(p);
  return h(
    'div',
    { class: 'video', 'data-youtube': id, 'data-titulo': titulo },
    h(
      'a',
      { class: 'video__capa capa-padrao', href: urlDoVideo(id), target: '_blank', rel: 'noopener' },
      h('span', { class: 'video__play', 'aria-hidden': 'true' }, play),
      h('span', { class: 'video__titulo' }, titulo),
      oculto(' (reproduzir vídeo do YouTube)'),
    ),
  );
}

/** Clique no vídeo → player do youtube-nocookie.com com autoplay (Ctrl/Cmd/meio abrem o YouTube). */
export function ativarVideos(raiz: HTMLElement): void {
  raiz.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const caixa = e.target.closest<HTMLElement>('.video[data-youtube]');
    const id = caixa?.dataset.youtube;
    if (!caixa || !id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    e.preventDefault();
    const player = document.createElement('iframe');
    player.className = 'video__player';
    player.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    player.title = caixa.dataset.titulo ?? 'Vídeo do YouTube';
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    caixa.replaceChildren(player);
    player.focus();
  });
}

/* ---------- Item do cronograma ---------- */

const ICONE_ANEXO: Record<Exclude<AnexoTurma['tipo'], 'youtube'>, keyof typeof ICONES> = {
  drive: 'arquivo',
  form: 'formulario',
  link: 'link',
};
const ORIGEM: Record<Exclude<AnexoTurma['tipo'], 'youtube'>, string> = { drive: 'Drive', form: 'Formulário', link: 'Link' };

function descricao(item: ItemTurma): HTMLElement | null {
  const linhas = linhasDaDescricao(item.descricao);
  if (linhas.length === 0) return null;
  const texto = h(
    'div',
    { class: 'item__descricao' },
    ...linhas.map((linha) =>
      h(
        'p',
        {},
        ...linha.map((t) =>
          'url' in t
            ? h('a', { href: t.url, target: '_blank', rel: 'noopener nofollow' }, t.url.replace(/^https:\/\//, ''))
            : t.texto,
        ),
      ),
    ),
  );
  return item.descricao.length > LIMITE_DESCRICAO_ABERTA
    ? h('details', { class: 'item__mais' }, h('summary', {}, 'Ver descrição'), texto)
    : texto;
}

function itemCronograma(item: ItemTurma, hoje: string, agora: Date, nivel: 'h3' | 'h4', arquivada: boolean): HTMLElement {
  const vencido = item.prazo !== null && Date.parse(item.prazo) <= agora.getTime();
  const videos = item.anexos.filter((a): a is Extract<AnexoTurma, { tipo: 'youtube' }> => a.tipo === 'youtube');
  const outros = item.anexos.filter((a): a is Exclude<AnexoTurma, { tipo: 'youtube' }> => a.tipo !== 'youtube');
  return h(
    'article',
    { class: 'item', id: `item-${item.id}` },
    h(
      'div',
      { class: 'item__topo' },
      h('span', { class: 'item__tipo' }, item.tipo === 'atividade' ? 'Atividade' : 'Material'),
      item.prazo &&
        h(
          'span',
          { class: 'prazo', 'data-vencido': vencido },
          icone('relogio'),
          h('span', {}, vencido ? 'Prazo encerrado: ' : 'Prazo: '),
          tempo(item.prazo, formatarDataHora(item.prazo, hoje)),
        ),
    ),
    h(nivel, { class: 'item__titulo' }, item.titulo),
    h('p', { class: 'item__meta' }, 'Publicado em ', tempo(item.publicadoEm, formatarDia(item.publicadoEm, hoje))),
    descricao(item),
    videos.length > 0 && h('div', { class: 'item__videos' }, ...videos.map((v) => video(v.youtubeId, v.titulo))),
    (outros.length > 0 || (item.tipo === 'atividade' && item.link)) &&
      h(
        'ul',
        { class: 'anexos', role: 'list', 'aria-label': 'Anexos' },
        ...outros.map((a) =>
          h(
            'li',
            {},
            h(
              'a',
              { class: 'anexo', href: a.url, target: '_blank', rel: 'noopener' },
              icone(ICONE_ANEXO[a.tipo]),
              h('span', { class: 'anexo__texto' }, h('span', { class: 'anexo__origem' }, ORIGEM[a.tipo]), a.titulo),
              novaAba(),
            ),
          ),
        ),
        item.tipo === 'atividade' &&
          item.link &&
          h(
            'li',
            {},
            h(
              'a',
              { class: 'anexo anexo--entrega', href: item.link, target: '_blank', rel: 'noopener' },
              icone('externo'),
              h(
                'span',
                { class: 'anexo__texto' },
                h('span', { class: 'anexo__origem' }, 'Classroom'),
                // Turma arquivada não aceita entregas: o atalho só abre a atividade.
                arquivada ? 'Ver a atividade' : 'Entregar a atividade',
              ),
              novaAba(),
            ),
          ),
      ),
  );
}

/* ---------- Faixa "agora" ---------- */

function rotulo(id: string, nome: keyof typeof ICONES, texto: string): HTMLElement {
  return h('h2', { class: 'portal-bloco__rotulo', id }, icone(nome), texto);
}

function blocoLives(c: ConteudoTurma, hoje: string, agora: Date): HTMLElement | null {
  const lives = proximasLives(c.itens, agora);
  if (lives.length === 0) return null;
  return h(
    'section',
    { class: 'card portal-bloco portal-bloco--lives', 'aria-labelledby': 'lives-titulo' },
    rotulo('lives-titulo', 'live', 'Próximas lives'),
    h(
      'ol',
      { class: 'lives', role: 'list' },
      ...lives.map((l) => {
        const hr = horarioDaLive(l.inicio, hoje);
        return h(
          'li',
          { class: 'live' },
          h(
            'span',
            { class: 'live__data', 'aria-hidden': 'true' },
            h('span', { class: 'live__dia' }, hr.selo.dia),
            h('span', { class: 'live__mes' }, hr.selo.mes),
          ),
          h(
            'div',
            { class: 'live__texto' },
            h('p', { class: 'live__titulo' }, h('a', { href: `#item-${l.itemId}` }, l.titulo)),
            h('p', { class: 'live__quando' }, tempo(l.inicio, `${hr.quando}, ${hr.hora}`), oculto(` (${hr.selo.extenso})`)),
            l.url &&
              h(
                'a',
                { class: 'botao live__link', href: l.url, target: '_blank', rel: 'noopener' },
                l.tipoLink === 'youtube' ? 'Assistir no YouTube' : 'Entrar na live',
                icone('externo'),
                novaAba(),
              ),
          ),
        );
      }),
    ),
  );
}

function blocoPrazos(c: ConteudoTurma, hoje: string, agora: Date): HTMLElement | null {
  const prazos = proximosPrazos(c.itens, agora);
  if (prazos.length === 0) return null;
  return h(
    'section',
    { class: 'card portal-bloco portal-bloco--prazos', 'aria-labelledby': 'prazos-titulo' },
    rotulo('prazos-titulo', 'relogio', 'Próximos prazos'),
    h(
      'ol',
      { class: 'prazos', role: 'list' },
      ...prazos.map((i) =>
        h(
          'li',
          { class: 'prazo-item' },
          h('a', { href: `#item-${i.id}` }, i.titulo),
          tempo(i.prazo, `até ${formatarDataHora(i.prazo, hoje)}`),
        ),
      ),
    ),
  );
}

function blocoTurma(c: ConteudoTurma): HTMLElement {
  return h(
    'section',
    { class: 'card portal-bloco portal-bloco--turma', 'aria-labelledby': 'turma-classroom-titulo' },
    rotulo('turma-classroom-titulo', 'turma', 'Turma no Classroom'),
    h(
      'p',
      {},
      c.arquivada
        ? 'Turma arquivada: o conteúdo fica disponível só para consulta.'
        : 'Entregas, avisos e comentários continuam na turma.',
    ),
    h(
      'div',
      { class: 'portal-bloco__acoes' },
      h(
        'a',
        { class: 'botao botao--contorno', href: c.link, target: '_blank', rel: 'noopener' },
        'Abrir no Classroom',
        icone('externo'),
        novaAba(),
      ),
      h('button', { class: 'portal-sair', type: 'button', 'data-portal-sair': true }, 'Sair'),
    ),
  );
}

/* ---------- Cronograma ---------- */

function cronograma(c: ConteudoTurma, hoje: string, agora: Date): HTMLElement {
  const grupos = cronogramaPorTopico(c);
  const comTopicos = grupos.some((g) => g.nome !== null);
  let n = 0;
  const passos = grupos.map((g, i) => ({
    ...g,
    ancora: `topico-${i + 1}`,
    numero: g.id === null ? null : String(++n).padStart(2, '0'),
  }));
  const lista = (itens: ItemTurma[], nivel: 'h3' | 'h4') =>
    h('ol', { class: 'cronograma__itens', role: 'list' }, ...itens.map((i) => h('li', {}, itemCronograma(i, hoje, agora, nivel, c.arquivada))));

  return h(
    'section',
    { class: 'card cronograma', 'aria-labelledby': 'cronograma-titulo' },
    h(
      'div',
      { class: 'cronograma__topo' },
      h('h2', { class: 'portal-bloco__rotulo', id: 'cronograma-titulo' }, 'Cronograma da turma'),
      h('p', { class: 'cronograma__nota' }, `Atualizado em ${formatarDataHora(agora.toISOString(), hoje)}`),
    ),
    grupos.length === 0 &&
      h('p', { class: 'cronograma__nota' }, 'Os materiais aparecem aqui assim que forem publicados no Classroom.'),
    !comTopicos && grupos.length === 1 && lista(grupos[0]!.itens, 'h3'),
    comTopicos &&
      h(
        'nav',
        { 'aria-label': 'Tópicos da turma' },
        h(
          'ul',
          { class: 'cronograma__indice', role: 'list' },
          ...passos.map((p) => h('li', {}, h('a', { href: `#${p.ancora}` }, p.numero && h('span', { class: 'mono' }, p.numero), p.nome ?? ''))),
        ),
      ),
    comTopicos &&
      h(
        'ol',
        { class: 'trilha', role: 'list' },
        ...passos.map((p) =>
          h(
            'li',
            { class: p.numero ? 'trilha__passo' : 'trilha__passo trilha__passo--geral', id: p.ancora },
            h('span', { class: 'trilha__marcador mono', 'aria-hidden': 'true' }, p.numero ?? ''),
            h(
              'div',
              { class: 'trilha__corpo' },
              h('h3', { class: 'trilha__titulo' }, p.numero && oculto(`Tópico ${p.numero}: `), p.nome ?? ''),
              h('p', { class: 'trilha__contagem' }, `${p.itens.length} ${p.itens.length === 1 ? 'item' : 'itens'}`),
              lista(p.itens, 'h4'),
            ),
          ),
        ),
      ),
  );
}

/** Portal completo: faixa "agora" e cronograma. */
export function montarPortal(c: ConteudoTurma, agora: Date = new Date()): DocumentFragment {
  const hoje = hojeEmSaoPaulo(agora);
  const fragmento = document.createDocumentFragment();
  fragmento.append(
    h(
      'div',
      { class: 'portal-agora' },
      blocoLives(c, hoje, agora),
      blocoPrazos(c, hoje, agora),
      blocoTurma(c),
    ),
    cronograma(c, hoje, agora),
  );
  return fragmento;
}
