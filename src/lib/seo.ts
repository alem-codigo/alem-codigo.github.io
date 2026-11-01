/**
 * SEO: rotas do sitemap e XML. Funções puras, testadas com Vitest.
 * As URLs terminam com barra: é o formato que o GitHub Pages serve (`/mentorias/index.html`),
 * o mesmo da canônica (Astro.url com `build.format: 'directory'`).
 */

/**
 * Caminhos das páginas estáticas a partir dos arquivos de `src/pages` (chaves do
 * `import.meta.glob`, ex.: `./mentorias/index.astro`). Ficam de fora as rotas dinâmicas
 * (`[codigo].astro`, listadas à parte), as páginas de erro e arquivos que começam com `_`.
 */
export function rotasEstaticas(arquivos: readonly string[]): string[] {
  return arquivos
    .map((arquivo) => arquivo.replace(/^(\.|\/src\/pages)\//, '').replace(/\.astro$/, ''))
    .filter((rota) => !rota.includes('[') && !rota.split('/').some((parte) => parte.startsWith('_')))
    .filter((rota) => !/^(404|500)$/.test(rota))
    .map((rota) => rota.replace(/(^|\/)index$/, ''))
    .map((rota) => (rota === '' ? '/' : `/${rota}/`))
    .sort();
}

const escaparXml = (texto: string): string =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** `sitemap.xml` (protocolo sitemaps.org) com URLs absolutas, sem repetições. */
export function gerarSitemap(site: URL, caminhos: readonly string[]): string {
  const urls = [...new Set(caminhos.map((c) => new URL(c, site).toString()))];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escaparXml(url)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}
