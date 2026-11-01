import { describe, expect, it } from 'vitest';
import { gerarSitemap, rotasEstaticas } from './seo';

describe('rotasEstaticas', () => {
  it('converte arquivos em caminhos com barra no fim', () => {
    expect(rotasEstaticas(['./index.astro', './mentorias/index.astro', './sobre.astro'])).toEqual([
      '/',
      '/mentorias/',
      '/sobre/',
    ]);
  });

  it('ignora rotas dinâmicas, páginas de erro e arquivos com _', () => {
    expect(
      rotasEstaticas(['./404.astro', './mentorias/[codigo].astro', './_rascunho.astro', './_parcial/x.astro']),
    ).toEqual([]);
  });

  it('aceita o caminho absoluto do glob', () => {
    expect(rotasEstaticas(['/src/pages/eixos/index.astro'])).toEqual(['/eixos/']);
  });
});

describe('gerarSitemap', () => {
  const site = new URL('https://alem-codigo.github.io');

  it('gera URLs absolutas, sem repetir', () => {
    const xml = gerarSitemap(site, ['/', '/mentorias/', '/mentorias/']);
    expect(xml).toContain('<loc>https://alem-codigo.github.io/</loc>');
    expect(xml.match(/<loc>https:\/\/alem-codigo\.github\.io\/mentorias\/<\/loc>/g)).toHaveLength(1);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('escapa caracteres especiais', () => {
    expect(gerarSitemap(site, ['/a?b=1&c=2'])).toContain('/a?b=1&amp;c=2');
  });
});
