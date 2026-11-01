/**
 * robots.txt: tudo liberado, com o endereço do sitemap. Enquanto o site não é indexado
 * (SITE.indexar), quem impede a indexação é o `noindex` das páginas, não este arquivo:
 * bloquear aqui impediria o LinkedIn de ler a prévia dos links e os buscadores de ver o `noindex`.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
