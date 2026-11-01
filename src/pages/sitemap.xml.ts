/**
 * sitemap.xml: páginas estáticas (descobertas a partir dos arquivos de src/pages) e as páginas
 * de todas as mentorias, inclusive as encerradas. Rotas dinâmicas novas (ex.: /eixos/[slug])
 * precisam ser acrescentadas aqui.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { caminhoMentoria } from '../lib/mentorias';
import { gerarSitemap, rotasEstaticas } from '../lib/seo';

const paginas = Object.keys(import.meta.glob('./**/*.astro'));

export const GET: APIRoute = async ({ site }) => {
  const mentorias = await getCollection('mentorias');
  const xml = gerarSitemap(site!, [...rotasEstaticas(paginas), ...mentorias.map((m) => caminhoMentoria(m.id))]);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
