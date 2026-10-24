// @ts-check
import { defineConfig } from 'astro/config';

// Site de usuário/organização no GitHub Pages: servido na raiz, sem `base`.
// Ao migrar para domínio próprio (D-08), basta trocar `site`.
export default defineConfig({
  site: 'https://alem-codigo.github.io',
});
