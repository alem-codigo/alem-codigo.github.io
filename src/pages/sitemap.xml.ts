/**
 * sitemap.xml: páginas estáticas (descobertas a partir dos arquivos de src/pages) e as páginas
 * de todas as mentorias (inclusive as encerradas) e dos eixos. Rotas dinâmicas novas precisam ser
 * acrescentadas aqui.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { caminhoEixo } from '../lib/eixos';
import { caminhoMentoria } from '../lib/mentorias';
import { gerarSitemap, rotasEstaticas } from '../lib/seo';

const paginas = Object.keys(import.meta.glob('./**/*.astro'));

export const GET: APIRoute = async ({ site }) => {
  const [mentorias, eixos] = await Promise.all([getCollection('mentorias'), getCollection('eixos')]);
  const xml = gerarSitemap(site!, [
    ...rotasEstaticas(paginas),
    ...mentorias.map((m) => caminhoMentoria(m.id)),
    ...eixos.map((e) => caminhoEixo(e.id)),
  ]);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
