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

## Conteúdo

Coleções em `src/content/` (`mentorias`, `mentores`, `eixos`), com schemas em `src/content.config.ts`. Datas são `YYYY-MM-DD` e precisam estar em ordem (abertura ≤ fechamento ≤ início ≤ fim); campo inválido ou referência a eixo/mentor inexistente quebra o build. A URL da mentoria vem do `codigo` (`M1.26A` → `/mentorias/m1-26a`).

Os arquivos `exemplo*` e `m0-26z.md` são apenas para validar os schemas e devem ser removidos na migração do conteúdo real.
