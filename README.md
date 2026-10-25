# Além do Código — site

Site do programa de mentorias Além do Código, em Astro, publicado em <https://alem-codigo.github.io>.

A spec do projeto (decisões, arquitetura, roadmap e runbook) é mantida no projeto do Claude e é a fonte da verdade.

## Desenvolvimento

Requisitos: Node.js 24 (LTS) e pnpm (versão fixada em `packageManager` no `package.json`).

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm test       # testes unitários (Vitest); pnpm test:watch em modo watch
pnpm build      # astro check + build em dist/
pnpm preview
```

## Deploy

Workflow `.github/workflows/deploy.yml`: roda testes, `astro check` e build; em pull requests só valida, sem publicar. Publica em push no `main`, manualmente (`Run workflow`) e diariamente às 02:00 de São Paulo (`0 5 * * *`). Usa apenas actions criadas pelo GitHub e as da allowlist da organização, fixadas por SHA.

## Estilos e identidade visual

CSS puro com design tokens em custom properties, sem framework (D-16).

- `src/styles/tokens.css`: cores (claro/escuro com `light-dark()`, seguindo o tema do sistema), tipografia, espaçamento, raios e movimento.
- `src/styles/global.css`: ordem das camadas (`reset`, `tokens`, `base`, `layout`, `components`, `utilities`). Estilos com escopo dos componentes `.astro` ficam fora das camadas e têm prioridade.
- Primitivos de layout: `.container`, `.pilha`, `.grupo`, `.grade`, `.secao`. Componentes: `.botao` (`--mono`, `--contorno`), `.icone` (quadradinho em ameixa) e `.card` com `data-variante="violeta" | "grafite"` (sem atributo, é o padrão) e `.card--brilho` (luz de duas cores que acompanha o mouse; script no layout).
- Contraste: `src/lib/tokens.test.ts` verifica os pares de cor contra o WCAG AA nos dois temas. Ao criar ou mudar uma cor, inclua o par no teste.
- Fontes: Atkinson Hyperlegible Next e Mono, servidas pelo próprio site a partir dos pacotes `@fontsource-variable/*` (API de fontes do Astro, em `astro.config.mjs`).
- Marca: logos em `public/marca/` (`logo.svg` troca as cores sozinho no tema escuro; `logo-grafite.svg` e `logo-branca.svg` são as monocromáticas) e favicons em `public/`.
- Logo animada do cabeçalho: `src/components/LogoAnimado.astro` (SVG inline em `src/assets/marca/logo-animado.svg`). No hover/foco, a estrada se forma do fim até a bandeira, que tremula ao final. A estrada é revelada por uma máscara com dois traços que seguem as linhas do desenho; se a logo mudar, esses traços precisam ser refeitos. Use uma vez por página; nos demais lugares, `<Logo />`.
- Navegação e rodapé: `src/lib/navegacao.ts` e `src/lib/site.ts` (os canais do rodapé ficam em `CANAIS`).

## Conteúdo

Coleções em `src/content/` (`mentorias`, `mentores`, `eixos`), com schemas em `src/content.config.ts`. Datas são `YYYY-MM-DD` e precisam estar em ordem (abertura ≤ fechamento ≤ início ≤ fim); campo inválido ou referência a eixo/mentor inexistente quebra o build. A URL da mentoria vem do `codigo` (`M1.26A` → `/mentorias/m1-26a`).

Os arquivos `exemplo*` e `m0-26z.md` são apenas para validar os schemas e devem ser removidos na migração do conteúdo real.
