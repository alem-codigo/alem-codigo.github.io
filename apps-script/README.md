# Sincronização do Classroom (Apps Script)

Lê as turmas do Classroom na conta Google do programa e grava `src/data/classroom/<courseId>.json` no repositório pela GitHub Contents API (spec, seções 6.6 e 8.1). O build do site nunca chama APIs do Google.

| Arquivo | Conteúdo |
|---|---|
| `nucleo.js` | Funções puras: lista branca do JSON, filtro de vídeos não públicos (D-13), remoção de links de reunião, datas em São Paulo, comparação sem `geradoEm`. Testado em `nucleo.test.ts` (`pnpm test`). |
| `sincronizar.js` | Chamadas ao Classroom, à Agenda, ao YouTube e ao GitHub; funções que se rodam pelo editor. |
| `appsscript.json` | Manifesto: fuso, V8, serviços avançados (Classroom v1, YouTube v3) e escopos só de leitura. |

O commit só acontece quando o conteúdo muda: o script compara o JSON novo com o arquivo atual do repositório, ignorando `geradoEm`. Por isso não há hash guardado nas Script Properties.

## Instalação (uma vez, na conta do programa)

1. Em <https://script.google.com>, logado na **conta Google do programa**, crie um projeto: "Sincronização do Classroom".
2. Em **Configurações do projeto**, marque "Mostrar o arquivo de manifesto `appsscript.json` no editor". No editor, substitua o conteúdo de `appsscript.json` pelo deste diretório. Os serviços avançados do Classroom e do YouTube são ativados pelo próprio manifesto.
3. Crie os arquivos `nucleo.gs` e `sincronizar.gs` (o editor usa `.gs`) e cole o conteúdo de `nucleo.js` e `sincronizar.js`. Apague o `Código.gs` vazio.
4. Crie o **token do GitHub** (fine-grained) em <https://github.com/settings/personal-access-tokens/new>:
   - Resource owner: `alem-codigo`; Repository access: **Only select repositories** → `alem-codigo.github.io`.
   - Permissions → Repository → **Contents: Read and write** (Metadata: Read-only entra sozinha).
   - Expiração: até 1 ano. **Anote a data na spec (seção 9, "Datas a acompanhar").**
5. Em **Configurações do projeto → Propriedades do script**, cadastre:

   | Propriedade | Valor |
   |---|---|
   | `COURSE_IDS` | IDs ou links das turmas, separados por vírgula ou linha (ex.: `869871604122`) |
   | `GITHUB_TOKEN` | O token do passo 4 |
   | `GITHUB_REPO` | `alem-codigo/alem-codigo.github.io` |
   | `GITHUB_BRANCH` | `main` (opcional; é o padrão) |
   | `GITHUB_AUTOR_EMAIL` | Opcional. E-mail `noreply` do GitHub (<https://github.com/settings/emails>, formato `123456+fabioacs@users.noreply.github.com`), para os commits saírem com ele (seção 10). Sem ele, o GitHub usa o e-mail do dono do token |

6. No editor, rode nesta ordem (selecione a função e clique em **Executar**):
   1. `verificarConfiguracao`: na primeira vez, pede a autorização dos escopos. Confere o token, o repositório e o acesso a cada turma e à agenda dela.
   2. `simular`: mostra no registro o JSON de cada turma, **sem gravar**. Confira que não há link de reunião nem vídeo não listado.
   3. `sincronizar`: faz o primeiro commit (dispara o deploy).
   4. `instalarGatilho`: cria o gatilho de hora em hora.

O token fica só nas Script Properties: nunca no código nem no repositório.

## Atualizar o código

Repita o passo 3 com os arquivos novos (o gatilho continua o mesmo). Se o manifesto mudar escopos, rode `verificarConfiguracao` para autorizar de novo.

Opcional, com o [clasp](https://github.com/google/clasp): `clasp login` com a conta do programa, `clasp clone <scriptId> --rootDir apps-script` uma vez (o `.clasp.json` gerado fica fora do git) e `clasp push` a cada mudança. O `.claspignore` envia só os três arquivos do script.

## Falhas

Uma turma com erro não impede as outras; no fim, a execução falha e o Apps Script manda o e-mail de falha do gatilho para a conta do programa. Os registros ficam em **Execuções** no editor. Casos comuns estão no runbook da spec (seção 13).
