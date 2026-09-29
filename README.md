# Privacy Inspector — extensão Firefox de auditoria de privacidade

Extensão para Firefox que observa, por aba, o comportamento de rastreamento de uma página:
conexões a domínios de terceira parte, cookies (primeira/terceira parte, sessão/persistentes),
armazenamento HTML5, fingerprinting (canvas, WebGL, áudio), bounce tracking / cookie sync e
indicadores de hijacking (WebSocket persistente, polling para terceiros, hooks em objetos globais).
Calcula uma pontuação de privacidade e permite uma lista de bloqueio personalizada.

Trabalho da disciplina de Cybersec — Insper.

## Carregando no Firefox (about:debugging)

1. Abra o Firefox e acesse `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…** (*Load Temporary Add-on…*).
3. Selecione o arquivo `src/manifest.json` deste repositório.
4. O ícone do Privacy Inspector aparece na barra de ferramentas. Navegue até uma página e clique
   no ícone para ver o relatório da aba.

A extensão temporária é removida ao fechar o Firefox; basta repetir os passos.

## O que o plugin detecta

| Eixo | Como |
|---|---|
| Domínios de 3ª parte | `webRequest.onBeforeRequest`, eTLD+1 comparado ao da aba; classificação por lista curada (`src/data/trackers.js`) |
| Cookies | `Set-Cookie` em `onHeadersReceived` (HTTP) + hook do setter de `document.cookie` (JS); snapshot via `cookies.getAll` classificando 1ª/3ª parte e sessão/persistente |
| Storage HTML5 | Hooks em `Storage`, `IDBFactory.open`, `CacheStorage.open` em todos os frames, marcando frames de 3ª parte |
| Fingerprinting | Canvas (heurística Englehardt/Blacklight), WebGL (vendor/renderer desmascarado), áudio, `measureText`, enumeração de `navigator`/`screen` |
| Bounce tracking | Cadeia 3xx da navegação de topo (`onBeforeRedirect`) e redirecionamento client-side com permanência < 4 s |
| Cookie sync | Valor de cookie de 1ª parte em query de terceiro; mesmo ID enviado a ≥ 2 terceiros; parâmetros típicos de sync; 3xx entre terceiros |
| Hijacking | WebSocket/EventSource para terceiros; polling regular ao mesmo endpoint; funções nativas sobrescritas (`Function.prototype.toString`); novos globais; listeners de teclado de 3ª parte |
| Pontuação | `src/score.js` — metodologia em `docs/metodologia-pontuacao.md` |
| Bloqueio | Lista personalizada em `storage.local`, aplicada com `webRequestBlocking` (aba "Bloqueio" do popup) |

Os hooks no contexto da página usam `wrappedJSObject` + `exportFunction` (API do Firefox), o que
funciona mesmo com CSP restritiva e não exige injetar `<script>` na página.

## Coleta de evidências (tools/)

Scripts em Python/Selenium que abrem o Firefox real com o plugin carregado como extensão temporária
(`.venv/bin/pip install selenium pillow markdown`):

| Script | Faz |
|---|---|
| `tools/capture_ddg.py` | roda as 12 páginas do DDG e salva print composto + JSON do plugin + resultado da própria página em `evidencias/ddg/` |
| `tools/capture_site.py <url>` | visita um site com o Network Monitor aberto; exporta o HAR do DevTools e o relatório do plugin (`evidencias/sites/<site>/`) |
| `tools/capture_ublock.py <url>` | mesma visita com o uBlock Origin; exporta o Logger e parseia os bloqueios |
| `tools/capture_blacklight.py <url>` | submete ao Blacklight e baixa o `blacklight-inspection.json` |
| `tools/reconcile.py <site>` | cruza plugin × Blacklight × uBlock × HAR por domínio (`reconciliacao.json`) |
| `tools/build_pdf.py` | gera `docs/relatorio.pdf` a partir dos markdowns de `docs/` |

O popup pode ser aberto em aba própria (`popup/popup.html?tabId=N` ou `?url=…`, botão "Abrir em aba"); é assim
que os prints de evidência são tirados, já que o painel do popup não aparece em capturas de tela automatizadas.

## Desenvolvimento

```bash
npx web-ext lint --source-dir src   # validação do manifest e das APIs
npx web-ext run  --source-dir src   # abre um Firefox de teste com o plugin carregado
```

## Estrutura

```
src/               código da extensão (manifest.json, background, content script, popup)
docs/              metodologia de pontuação (metodologia-pontuacao.md) e modelo de relatório (relatorio-modelo.md)
evidencias/ddg     prints da execução nas DuckDuckGo Privacy Test Pages
evidencias/sites   arquivos HAR e prints dos 3 sites reais
```
