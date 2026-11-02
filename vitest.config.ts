import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // tokens.test.ts importa tokens.css com `?raw`; sem isso o Vitest entrega CSS vazio.
    css: { include: [/tokens\.css/] },
  },
});
