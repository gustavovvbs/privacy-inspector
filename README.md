# Privacy Inspector — extensão Firefox de auditoria de privacidade

Extensão para Firefox que observa, por aba, o comportamento de rastreamento de uma página:
conexões a domínios de terceira parte, cookies (primeira/terceira parte, sessão/persistentes),
armazenamento HTML5, fingerprinting (canvas, WebGL, áudio), bounce tracking / cookie sync e
indicadores de hijacking (WebSocket persistente, polling para terceiros, hooks em objetos globais).
Calcula uma pontuação de privacidade e permite uma lista de bloqueio personalizada.

Trabalho da disciplina de Segurança — Insper.

## Carregando no Firefox (about:debugging)

1. Abra o Firefox e acesse `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…** (*Load Temporary Add-on…*).
3. Selecione o arquivo `src/manifest.json` deste repositório.
4. O ícone do Privacy Inspector aparece na barra de ferramentas. Navegue até uma página e clique
   no ícone para ver o relatório da aba.

A extensão temporária é removida ao fechar o Firefox; basta repetir os passos.

## Estrutura

```
src/               código da extensão (manifest.json, background, content script, popup)
docs/              metodologia de pontuação, modelo de relatório
evidencias/ddg     prints da execução nas DuckDuckGo Privacy Test Pages
evidencias/sites   arquivos HAR e prints dos 3 sites reais
```
