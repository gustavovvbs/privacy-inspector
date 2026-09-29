# Modelo do relatório (entregáveis 2, 3 e 4)

> Preencher e exportar para PDF. Todos os prints ficam em `evidencias/` e são referenciados aqui.

## 1. Identificação

- Aluno, matrícula, turma.
- Versão do Firefox e commit do plugin usado nos testes (`git rev-parse --short HEAD`).

## 2. DuckDuckGo Privacy Test Pages

Para cada página: abrir com o plugin carregado, executar o teste, abrir o popup, tirar print
(`evidencias/ddg/<pagina>.png`) e preencher a linha. A coluna "esperado" é o que a **própria página**
reporta (ela mostra o que carregou/falhou ou o que conseguiu armazenar).

| # | Página | URL | Resultado esperado (reportado pela página) | Resultado do plugin | Divergência e explicação técnica | Print |
|---|---|---|---|---|---|---|
| 1 | Tracker Reporting – via script | https://privacy-test-pages.site/tracker-reporting/1major-via-script.html | | | | |
| 2 | Tracker Reporting – via img | https://privacy-test-pages.site/tracker-reporting/1major-via-img.html | | | | |
| 3 | Tracker Reporting – via fetch (5 s) | https://privacy-test-pages.site/tracker-reporting/1major-via-fetch.html | | | | |
| 4 | Tracker Reporting – com surrogate | https://privacy-test-pages.site/tracker-reporting/1major-with-surrogate.html | | | | |
| 5 | Tracker Blocking (request blocking) | https://privacy-test-pages.site/privacy-protections/request-blocking/ | | | | |
| 6 | Storage blocking | https://privacy-test-pages.site/privacy-protections/storage-blocking/ | | | | |
| 7 | Storage partitioning | https://privacy-test-pages.site/privacy-protections/storage-partitioning/ | | | | |
| 8 | Fingerprinting (geral) | https://privacy-test-pages.site/privacy-protections/fingerprinting/ | | | | |
| 9 | Fingerprinting – canvas | https://privacy-test-pages.site/privacy-protections/fingerprinting/canvas.html | | | | |
| 10 | Bounce tracking | https://privacy-test-pages.site/privacy-protections/bounce-tracking/ | | | | |
| 11 | Query parameters | https://privacy-test-pages.site/privacy-protections/query-parameters/ | | | | |
| 12 | js-leaks (alterações em objetos globais) | https://privacy-test-pages.site/security/js-leaks.html | | | | |

Notas de execução por página:

- **Tracker Blocking:** a página pede que `bad.third-party.site` esteja na lista de bloqueio. Rodar duas
  vezes: (a) sem bloqueio, para o plugin *reportar* as requisições; (b) com `bad.third-party.site` na
  lista de bloqueio personalizada, para verificar quais tipos de requisição o `webRequest` consegue
  cancelar (a página lista HTML, CSS, JS, "other").
- **Storage blocking / partitioning:** clicar em "Store data" e depois "Retrieve data". Comparar o que a
  página diz ter conseguido armazenar com o que o plugin registrou (localStorage, sessionStorage,
  IndexedDB, Cache API, cookies via JS) e em qual frame (1ª ou 3ª parte).
- **Bounce tracking:** clicar em um dos links; a passagem por `bad.third-party.site` deve aparecer na aba
  Bounce/Sync com o parâmetro de UID repassado ao destino.
- **js-leaks:** a página lista objetos globais/nativos modificados. O próprio plugin instala hooks
  (canvas, storage, `document.cookie`, `addEventListener`…) via `exportFunction`, portanto pode ser
  detectado por ela. Explicar o que a página detectou do plugin e o que o plugin detectou da página.

## 3. Sites reais (sorteados por matrícula)

Para cada site: `evidencias/sites/<site>/` com `<site>.har` (DevTools → Rede → engrenagem → "Salvar tudo
como HAR"), `plugin.png`, `plugin.json` (botão Exportar JSON), `blacklight.png` e `ublock.png`.

### 3.x `<site>`

| Fonte | Rastreadores / domínios | Cookies 3ª parte | Canvas FP | Gravação de sessão | Key logging | FB pixel | Google remarketing |
|---|---|---|---|---|---|---|---|
| Plugin | | | | | | | |
| Blacklight | | | | | | | |
| uBlock Origin (bloqueios) | | | | | | | |

**Reconciliação** — um item por rastreador visto em uma fonte e não em outra, sempre citando a
requisição no HAR (URL, tipo, iniciador, status):

| Domínio | Plugin | Blacklight | uBlock | Explicação técnica (com referência ao HAR) |
|---|---|---|---|---|

## 4. Pontuação de privacidade

Metodologia em `docs/metodologia-pontuacao.md`. Para cada site: composição da nota (print da aba Resumo)
e comparação crítica com o Blacklight — onde concordam, onde divergem e por quê.

| Site | Nota do plugin | Conceito | Indicadores Blacklight | Concordâncias | Divergências |
|---|---|---|---|---|---|
