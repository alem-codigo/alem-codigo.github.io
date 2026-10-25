// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

/*
 * Fontes servidas pelo próprio site, a partir dos pacotes do Fontsource (versionados no
 * lockfile e atualizados pelo Dependabot). O build não acessa rede para resolvê-las.
 *
 * Só o subconjunto `latin` (cobre o português inteiro); caracteres fora dele caem no fallback.
 * Obs.: o provedor `npm` com `remote: false` gera URLs file:// que a API de fontes do
 * Astro 7.4 não lê; por isso o provedor `local` aponta direto para os arquivos do pacote.
 */
/** @param {string} arquivo */
const texto = (arquivo) => `@fontsource-variable/atkinson-hyperlegible-next/files/${arquivo}`;
/** @param {string} arquivo */
const mono = (arquivo) => `@fontsource-variable/atkinson-hyperlegible-mono/files/${arquivo}`;

// Site de usuário/organização no GitHub Pages: servido na raiz, sem `base`.
// Ao migrar para domínio próprio (D-08), basta trocar `site`.
export default defineConfig({
  site: 'https://alem-codigo.github.io',
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Next',
      cssVariable: '--fonte-texto',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { src: [texto('atkinson-hyperlegible-next-latin-wght-normal.woff2')], weight: '200 800', style: 'normal' },
          { src: [texto('atkinson-hyperlegible-next-latin-wght-italic.woff2')], weight: '200 800', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Atkinson Hyperlegible Mono',
      cssVariable: '--fonte-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          { src: [mono('atkinson-hyperlegible-mono-latin-wght-normal.woff2')], weight: '200 800', style: 'normal' },
        ],
      },
    },
  ],
});
