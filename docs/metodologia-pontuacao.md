# Metodologia da pontuação de privacidade

A nota parte de **100 pontos** e sofre deduções por critério. Cada critério tem um **teto**, para que um
único eixo (ex.: um site com 40 domínios de anúncios) não zere a nota sozinho e para que sites com
problemas em *vários* eixos sejam penalizados mais que sites com um único problema grande.

| Critério | Dedução | Teto | Justificativa |
|---|---|---|---|
| Rastreadores conhecidos de 3ª parte (lista interna) | 4 por domínio | 32 | É o indicador mais direto de vigilância comercial; corresponde aos "ad trackers" do Blacklight. |
| Outros domínios de 3ª parte (não listados) | 1 por domínio | 8 | CDNs e APIs também recebem IP, referrer e user-agent, mas sem intenção declarada de rastrear. Peso baixo. |
| Cookies de 3ª parte | 2 por cookie | 16 | Mecanismo clássico de rastreamento entre sites; o Blacklight reporta a mesma contagem. |
| Cookies persistentes com validade > 1 ano | 1 por cookie | 6 | Longevidade aumenta a janela de correlação de comportamento. |
| Fingerprinting | 15 (provável) / 7 (possível) | 15 | Não pode ser apagado pelo usuário como um cookie; "provável" segue a heurística de Englehardt & Narayanan (texto desenhado + leitura ≥ 16×16), a mesma do Blacklight. |
| Gravação de sessão / heatmap | 10 | 10 | Captura movimentos, cliques e, por vezes, conteúdo digitado (Hotjar, FullStory, Clarity…). Blacklight: "session recorders". |
| Captura de teclado por script de 3ª parte | 10 | 10 | Listener de `keydown/keyup/input` em `document`/`window` registrado por script de outro domínio. Blacklight: "key logging". |
| Pixel do Facebook/Meta | 6 | 6 | Destacado separadamente pelo Blacklight por permitir vincular a navegação a um perfil social real. |
| Remarketing Google (DoubleClick / Google Ads) | 4 | 4 | Idem, categoria própria no Blacklight ("Google Analytics remarketing"). |
| Cookie sync / vazamento de identificador | 8 (forte) / 4 (fraco) | 8 | Forte: valor de cookie de 1ª parte enviado a terceiro, ou mesmo ID enviado a ≥ 2 terceiros. Fraco: parâmetro típico de sync (`uid`, `puid`…) ou redirecionamento 3xx entre terceiros em pixel. |
| Bounce tracking | 6 | 6 | Domínio intermediário (3xx ou redirecionamento client-side com permanência < 4 s) que não é origem nem destino da navegação. |
| Storage HTML5 em frame de 3ª parte | 4 | 4 | Alternativa a cookies de 3ª parte quando estes são bloqueados. |
| Indicadores de hijacking | 15 (alto) / 8 (médio) / 3 (baixo) | 15 | Alto: função nativa sobrescrita, keylogger de 3ª parte, ou WebSocket + polling para terceiros. Médio: WebSocket **ou** polling persistente para terceiro. Baixo: muitos globais novos ou EventSource. |

**Conceito:** A ≥ 85 · B ≥ 70 · C ≥ 50 · D ≥ 30 · E < 30.

## Como comparar com o Blacklight

O Blacklight (The Markup) **não emite nota numérica**: ele lista indicadores e compara cada um com a
média dos 100 mil sites mais populares (Tranco). A comparação, portanto, é feita indicador a indicador:

| Blacklight | Critério equivalente no plugin |
|---|---|
| Ad trackers (N) | Rastreadores conhecidos (categorias *advertising*, *analytics*, *identity*) |
| Third-party cookies (N) | Cookies de 3ª parte (snapshot do cookie jar) |
| Canvas fingerprinting | Fingerprinting ≥ "provável" com `canvas.likely > 0` |
| Session recording | Rastreador da categoria *session-recording* |
| Key logging | Listener de teclado por script de 3ª parte em `document` |
| Facebook pixel | Rastreador com owner "Meta (Facebook pixel)" |
| Google Analytics remarketing | Domínios doubleclick / googlesyndication / googleadservices |

Fontes esperadas de divergência (a serem explicadas caso a caso no relatório, com referência ao HAR):

1. **Interação.** O Blacklight rola a página e clica em alguns links; o plugin observa apenas o que o
   usuário fez. Rastreadores carregados sob demanda podem aparecer só em um dos lados.
2. **Consentimento (LGPD/GDPR).** O Blacklight não aceita banners de cookies; se o usuário aceitou, o
   plugin verá mais rastreadores.
3. **Lista de domínios.** O Blacklight usa a lista do DuckDuckGo Tracker Radar (milhares de domínios);
   a lista interna do plugin é curada e menor. Domínios "não listados" do plugin podem ser rastreadores
   para o Blacklight, e vice-versa.
4. **Localização.** O Blacklight roda a partir dos EUA; anúncios e parceiros de RTB variam por região.
5. **Momento.** Os scripts de terceiros mudam ao longo dos dias; os dois relatórios devem ser
   produzidos na mesma data sempre que possível.
