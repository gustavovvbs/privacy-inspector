# Entregável 3 — Análise de 3 sites reais

**Sites analisados:** `www.uol.com.br` (portal de notícias), `www.terra.com.br` (portal de notícias) e
`www.mercadolivre.com.br` (e-commerce). Como a lista sorteada por matrícula não estava disponível no momento da
coleta, foram escolhidos três sites brasileiros de grande audiência e perfis diferentes.

**Método (mesma visita para HAR e plugin).** `tools/capture_site.py` abre o Firefox 156 com o plugin carregado e o
Network Monitor aberto, visita a home, rola a página quatro vezes e aguarda 30 s; ao final exporta o **HAR pelo
próprio Network Monitor** (`HarExporter.fetchHarData`, com todas as requisições da visita) e o relatório do plugin
(JSON + prints das abas). Em seguida, `tools/capture_ublock.py` visita o mesmo site num Firefox com **uBlock Origin
1.75.0** (listas padrão) e exporta o Logger do uBlock; e `tools/capture_blacklight.py` submete o site ao
**Blacklight** (The Markup) e baixa o arquivo `blacklight-inspection.json` da inspeção. Tudo em 29/09/2026,
00:05–00:26 (BRT). Arquivos por site em `evidencias/sites/<site>/`:

| Arquivo | Conteúdo |
|---|---|
| `<site>.har` | HAR do DevTools do Firefox (visita completa) |
| `relatorio.png`, `relatorio.json` | print composto (página + 7 abas do plugin) e relatório exportado |
| `ublock.png`, `ublock-popup.png`, `ublock-logger.txt`, `ublock.json` | Logger e painel do uBlock, export bruto e bloqueios parseados |
| `blacklight.png`, `blacklight.txt`, `blacklight-inspection.json` | resultado do Blacklight (tela, texto e JSON completo) |
| `reconciliacao.json` | cruzamento domínio a domínio das quatro fontes (`tools/reconcile.py`) |

## 3.1 Visão geral

| | UOL | Terra | Mercado Livre |
|---|---|---|---|
| Requisições observadas pelo plugin (HAR) | 221 (257) | 223 (235) | 252 (307) |
| … para domínios de 3ª parte / afiliados | 101 / 87 | 17 / 189 | 8 / 241 |
| Domínios de 3ª parte (não afiliados) | 19 | 11 | 3 |
| … dos quais rastreadores conhecidos | 15 | 10 | 1 (Hotjar) |
| Domínios afiliados (mesma organização) | 4 (`jsuol.com.br`, `imguol.com.br`, `uol.com`, `jsuol.com`) | 2 (`trrsf.com`, `trrsf.com.br`) | 7 (`mlstatic.com`, `mercadolibre.com`, `mercadoclics.com`, `meli.com`, `mercadopago.com(.br)`, `mercadolivre.com`) |
| Cookies no jar: total (1ª / 3ª parte) | 18 (8 / 10) | 9 (9 / 0) | 14 (14 / 0) |
| Cookies injetados: `Set-Cookie` (3ª parte) + `document.cookie` | 49 (48) + 86 | 12 (0) + 9 | 41 (1) + 25 |
| Fingerprinting (plugin) | possível (enumeração de `navigator`/`screen` por scripts do Google/YouTube) | nenhum | nenhum |
| Hijacking (plugin) | **alto**: listener `keydown/keyup` em `document` pelo SDK da Marfeel (`sdk.mrf.io`); polling a `events.newsroom.bi` | baixo: `console.log` sobrescrito, 88 globais novos, WebSocket 1ª parte (`rt-cloud.terra.com.br`) | nenhum |
| Bounce / cookie sync (plugin) | cookie sync: id `k=d2934e09…` enviado a `prmutv.co`, `permutive.com` e `cm.g.doubleclick.net` (`google_nid=permutive_dmp&google_cm`) | — | — |
| **Nota do plugin** | **0 (E)** | **59 (C)** | **79 (B)** |
| uBlock Origin: bloqueios de rede (redirecionados) | 41 (6) | 23 (4) | 46 (0) |
| Blacklight: ad trackers / cookies 3ª parte | 88 / 271 | 83 / 310 | 0 / 3 |
| Blacklight: canvas / session recording / key logging / FB pixel / GA remarketing | não / não / não / **sim** / **sim** | não / não / não / não / **sim** | não / **Hotjar** / não / não / não |

## 3.2 UOL — `www.uol.com.br`

**O que o plugin viu (HAR `uol.com.br.har`, 257 entradas, 24 eTLD+1).** Quinze rastreadores conhecidos:
Google Ad Manager (`securepubads.g.doubleclick.net/tag/js/gpt.js`, `googleads.g.doubleclick.net/pagead/id`),
Xandr (`ib.adnxs.com/getuidj?gdpr=0`, `secure.adnxs.com/seg?add=…`), Amazon (`c.amazon-adsystem.com/aax2/apstag.js`),
comScore (`sb.scorecardresearch.com`), Chartbeat, Google Tag Manager, Permutive (`permutive.com`, `permutive.app`,
`prmutv.co`), Marfeel (`sdk.mrf.io/statics/marfeel-sdk.js`), Newsroom AI (`events.newsroom.bi/multimedia.php`,
24 requisições, 5 delas em polling regular), Piano/Tinypass, LiveRamp ATS (`ats-wrapper.privacymanager.io`) e dois
embeds do YouTube (25 requisições, 5 cookies de 3ª parte, 54 escritas em `localStorage` dentro do iframe).
Não listados: `google.com`, `gstatic.com`, `googleapis.com` (fontes/recaptcha/IMA SDK) e `turner.com`.

**Cookie sync observado (HAR):** `https://cm.g.doubleclick.net/pixel?google_nid=permutive_dmp&google_cm&type=ddp&k=d2934e09-3372-4691-ade8-1a2726d74798&u=…`
— é o *cookie matching* do Google (`google_cm`) com a DMP Permutive; o mesmo `k` aparece em requisições a
`prmutv.co` e `permutive.com`. O plugin classificou como "ID compartilhado" com 3 domínios.

**uBlock Origin (41 bloqueios de rede).** `||doubleclick.net^` (10), `||tm.jsuol.com.br^` e `||jsuol.com.br/aud/$script`
(10 — o tag manager e o módulo de audiência do próprio UOL), YouTube (`||youtube.com/youtubei/v1/log_event`, 8),
`||imasdk.googleapis.com^` (5), `||chartbeat.com^$3p` (3), `||sdk.mrf.io/statics/marfeel-sdk.js`,
`||scorecardresearch.com^`, `||permutive.app^`, `/publicidade/*$~xhr` (em `conteudo.imguol.com.br`), `||logger.uol.com.br^`.
Além disso 125 injeções de *scriptlet* (quase todas contra anúncios do player do YouTube) e 6 *redirects* (stubs
neutros para `gpt.js`, `chartbeat_mab.js`, `ad_status.js`).

**Blacklight (visita 29/09/2026 00:05 BRT, Chrome headless em Ohio).** 88 ad trackers, 271 cookies de 3ª parte de
121 domínios, 273 hosts de terceiros; FB pixel e GA remarketing presentes; sem canvas, session recording ou key logging.

### Reconciliação

| Domínio / indicador | Plugin | Blacklight | uBlock | Explicação técnica (com referência ao HAR) |
|---|---|---|---|---|
| `doubleclick.net` (Google Ad Manager) | rastreador, 6 req. (`gpt.js`, `pagead/id`, `cm.g…/pixel`, `ad_status.js`) | 66 req. de tracker, incl. 13 `gampad/ads` | bloqueado (10) | **Concordam** que o GAM está presente. Divergem no volume: no nosso HAR não há **nenhuma** requisição `gampad/ads` nem `googlesyndication.com` — o `gpt.js` carrega, mas o leilão não acontece (ver bloco abaixo). |
| `adnxs.com`, `amazon-adsystem.com` (Prebid/TAM) | rastreadores, 2+1 req. (`getuidj`, `apstag.js`) | 43 + 57 req. | não bloqueado no nosso HAR (só `apstag.js` redirecionado) | `tm.jsuol.com.br/modules/external/Prebid.js` carrega (HAR), mas só faz *user sync* com Xandr; não há chamadas de lance (`/openrtb2/auction`, `ib.adnxs.com/ut/v3`). No Blacklight o leilão completo rodou. |
| 136 domínios só no Blacklight (`rubiconproject.com` 123 req., `googlesyndication.com` 69, `smartadserver.com` 36, `seedtag.com` 29, `pubmatic.com`, `sonobi.com` 20 cookies…) | não vistos | ad trackers + cookies | — | **Divergência principal.** É a cadeia programática (SSPs, DSPs, *cookie sync* `usync.html` = 181 req.) que só dispara quando o leilão do GAM/Prebid roda. Hipóteses testadas e descartadas (pastas `uol-sem-webdriver` e `uol-com-consentimento`): (1) automação — com `navigator.webdriver` oculto o HAR continua sem leilão; (2) consentimento LGPD — com o banner aceito (`upc.udr.uol.com.br/api/userConsent/put?consentStatus=consent` no HAR) idem. Explicação restante: **origem do tráfego**. O Blacklight conecta a partir dos EUA (envia `x-forwarded-for` com nosso IP, mas o IP de conexão é de Ohio); para tráfego internacional o UOL vende o inventário remanescente no mercado aberto (dezenas de SSPs), enquanto para visitantes brasileiros a home serve inventário próprio (`conteudo.imguol.com.br/publicidade/…`, que o uBlock bloqueia com `/publicidade/*$~xhr`). Metade das requisições do Blacklight (176) veio ainda da 2ª página visitada (`noticias.uol.com.br/politica/governo-lula/`), que o plugin não visitou. |
| `facebook.net` / FB pixel | não visto | **sim** (4 req.) | — | Não há nenhuma requisição a `facebook.net`/`facebook.com` no HAR; o pixel foi carregado apenas no fluxo de anúncios/2ª página do Blacklight. |
| `permutive.com/.app`, `prmutv.co` | rastreador (DMP), cookie sync com Google | 19 req. | `||permutive.app^` | Concordam. O plugin adiciona a evidência do *cookie matching* (`cm.g.doubleclick.net/pixel?google_nid=permutive_dmp`). |
| `newsroom.bi` | rastreador, 24 req., 4 cookies 3ª parte, polling regular | 27 req., 4 cookies | não bloqueado | Concordam; o uBlock não tem filtro para o domínio (listas padrão). |
| `mrf.io` (Marfeel) | rastreador; listener `keydown/keyup` em `document` → **key logging / hijacking alto** | 0 req. de tracker; **key logging: não** | `||sdk.mrf.io/statics/marfeel-sdk.js` | **Divergência de critério.** O plugin reporta a *capacidade* (listener de teclado registrado por script de terceiro no frame principal); o Blacklight só marca *key logging* quando digita em campos e vê o texto sair em requisições. O SDK da Marfeel registra `keydown` para métricas de engajamento; não há evidência de exfiltração no HAR. |
| `youtube.com`, `ytimg.com` | rastreador (embed), 5 cookies, storage em iframe de 3ª parte, "fingerprinting possível" | 5 req. (`youtube.com`) e 5 cookies | 8 bloqueios (`log_event`, `generate_204`) + scriptlets | Concordam na presença. O "fingerprinting possível" vem da enumeração de 14 propriedades por `www.google.com/js/th/…` (botguard) e 8 por `ytembeds`; o Blacklight não tem esse critério (só canvas/fonts). Os 20 listeners de teclado dentro do iframe do player não contam como key logging (só veem o próprio iframe). |
| `chartbeat.com`, `scorecardresearch.com`, `googletagmanager.com`, `tinypass.com`, `privacymanager.io` | rastreadores | presentes | chartbeat e comScore bloqueados; GTM e Piano não | Concordam. `privacymanager.io` (CMP/ATS da LiveRamp) é classificado pelo plugin como *identity* porque o módulo ATS (`ats.js`) resolve identidades por e-mail; o uBlock não bloqueia CMPs. |
| `jsuol.com.br`, `imguol.com.br` | **afiliados** (excluídos da nota) | 48 req. contadas como tracker (`tm.jsuol.com.br`) | 10 bloqueios (`||tm.jsuol.com.br^`, `/aud/`) | **Divergência de definição.** Para EasyPrivacy e para o Blacklight o tag manager/módulo de audiência do UOL é rastreador (é 3ª parte por eTLD+1); o plugin o trata como mesma organização. A escolha é discutida na pontuação. |
| Cookies de 3ª parte | 10 (YouTube 5, Newsroom 4, Permutive 1) | 271 | — | Consequência direta do leilão não ter ocorrido: os 271 cookies do Blacklight vêm de 121 domínios de ad-tech (`sonobi.com` 20, `pubmatic.com` 17…), nenhum contactado no nosso HAR. |

## 3.3 Terra — `www.terra.com.br`

**Plugin (HAR `terra.com.br.har`, 235 entradas, 14 eTLD+1).** Dez rastreadores: GAM (`gpt.js`), GTM, Tail
(`tags.t.tailtarget.com`, `c.t.tailtarget.com`), comScore, Chartbeat, Criteo (`gum.criteo.com/sid/json?origin=prebid…`),
LiveRamp (`rlcdn.com`) e LiveRamp ATS/CMP (`privacymanager.io`, 6 req.), Amazon (`apstag.js`), Taboola. 189 das 223
requisições vão para os CDNs afiliados `trrsf.com`/`trrsf.com.br` (`s1.trrsf.com/…/zaz-3rd/prebid/prebid.js`,
`p1-cloud.trrsf.com.br/api/includer/include?component=mod.aps&component=mod.prebid…`). Cookies: 9, todos de 1ª parte.
Hijacking baixo: `console.log` sobrescrito (silenciamento do console), 88 globais novos (`zaz-*`), WebSocket de
1ª parte `wss://rt-cloud.terra.com.br/client/hubs/Portal`.

**uBlock (23 bloqueios de rede, 4 redirects):** `/prebid/*$script` e `||trrsf.com/*/mod-stalker.min.js` (o Prebid e
um módulo "stalker" do próprio Terra), `/tagman/*` em `p1-cloud.trrsf.com.br` (4), `||tailtarget.com^$3p` (3),
`||taboola.com^` (2), `||amazon-adsystem.com^`, `||chartbeat.com^$3p`, `||googletagmanager.com^`,
`||securepubads.g.doubleclick.net/tag/js/gpt.js$…redirect`, `||scorecardresearch.com^`.

**Blacklight:** 83 ad trackers, 310 cookies de 3ª parte (118 domínios), 257 hosts; GA remarketing sim; FB pixel não.

### Reconciliação

| Domínio / indicador | Plugin | Blacklight | uBlock | Explicação técnica |
|---|---|---|---|---|
| `doubleclick.net`, `amazon-adsystem.com`, `criteo.com`, `tailtarget.com`, `taboola.com` | rastreadores, 1–2 req. cada | 89 / 71 / 30 / 30 / 6 req. | bloqueados | Mesmo padrão do UOL: `prebid.js` e `apstag.js` carregam e fazem *sync* (`gum.criteo.com/sid/json?origin=prebid`), mas não há `gampad/ads` nem `googlesyndication.com` no HAR; no Blacklight, 15 `gampad` e 70 `googlesyndication`. A Tail (`tailtarget.com`, DMP brasileira) recebeu 30 req. no Blacklight contra 1 aqui — reforça que o leilão inteiro (incl. segmentação) só rodou lá. |
| 138 domínios só no Blacklight (`rubiconproject.com` 61, `bidswitch.net` 36, `smartadserver.com` 35, `id5-sync.com` 21, `a-mo.net` 24 cookies, `tappx.com` 22 cookies…) | não vistos | ad trackers/cookies | — | Cadeia programática + *cookie sync* (`/3192/CookieSync.html` 79 req., `/sync` 54, `usync.html` 51 no Blacklight). Mesma explicação de origem do tráfego; 122 requisições vieram da 2ª página (`terra.com.br/noticias/eleicoes/…`). |
| `trrsf.com`, `trrsf.com.br` | afiliados (176 + 13 req.) | 4 + 10 req. como tracker | 8 bloqueios (`prebid`, `mod-stalker`, `tagman`) | Divergência de definição, como no UOL: o Prebid e o tag manager do Terra vivem no CDN afiliado. Note que o uBlock bloqueia o `prebid.js` na origem, o que impede todo o leilão. |
| `rlcdn.com`, `privacymanager.io` (LiveRamp) | rastreadores (*identity*) | `rlcdn.com` 7 req. | não bloqueados | Concordam em `rlcdn.com`. O CMP (`privacymanager.io`) não é rastreador para o uBlock/Blacklight; o plugin o marca por causa do módulo ATS. |
| GA remarketing | GAM/`doubleclick.net` presente (−4) | sim | — | Concordam (critério equivalente: `doubleclick.net`/`googlesyndication`). |
| Cookies de 3ª parte | 0 | 310 | — | O HAR não contém nenhum `Set-Cookie` de terceiro (`injectedHttpThirdParty = 0`): sem leilão, sem cookies de SSPs. |
| Hijacking baixo | `console.log` sobrescrito; 88 globais; WebSocket 1ª parte | — | `mod-stalker.min.js` bloqueado | Não há equivalente no Blacklight. O WebSocket é de 1ª parte (notificações em tempo real) e não pontua; `console.log` sobrescrito é prática comum de silenciamento e pesa como "baixo". |

## 3.4 Mercado Livre — `www.mercadolivre.com.br`

**Plugin (HAR `mercadolivre.com.br.har`, 307 entradas, 11 eTLD+1).** Apenas 8 de 252 requisições vão a terceiros não
afiliados: Hotjar (`static.hotjar.com/c/hotjar-….js` — gravação de sessão), `accounts.google.com/gsi/iframe/select`
(Sign in with Google, em iframe) e `gstatic.com`. 241 requisições vão a domínios do grupo (`mlstatic.com` 182,
`api.mercadolibre.com` 24, `meli.com` 17, `print1.mercadoclics.com/display/prints/MLB/count` 15, pixels `melidata`
em `mercadopago.com(.br)`/`mercadolivre.com`/`mercadolibre.com`). Cookies: 14, todos de 1ª parte, 5 com validade
> 1 ano. Sem fingerprinting, sem hijacking (os 3 listeners de teclado estão dentro do iframe do Google).

**uBlock (46 bloqueios):** `||mercadoclics.com^$3p` (39 — EasyPrivacy), `/pixel.gif?` nos quatro hosts `melidata`,
`||hotjar.com^`, `||matt.mercadolivre.com.br^`, `/log?format=` (play.google.com).

**Blacklight:** "0 ad trackers" na página de resultado, mas o JSON lista 20 requisições a `mercadoclics.com` e 3 a
`hotjar.com` como *TrackingRequest* (EasyPrivacy); 3 cookies de 3ª parte (`mercadoclics.com`, `mercadolibre.com`,
`meli.com`); **session recorder: Hotjar**; sem key logging, canvas, FB ou GA remarketing.

### Reconciliação

| Domínio / indicador | Plugin | Blacklight | uBlock | Explicação técnica |
|---|---|---|---|---|
| `hotjar.com` | rastreador *session-recording* (−10) | session recorder (`script.hotjar.com`, `static.hotjar.com`) | `||hotjar.com^` | **Concordam as três fontes.** |
| `mercadoclics.com` | afiliado (15 req. de `print1.mercadoclics.com/display/prints/MLB/count`) | 20 req. como tracker (filtro `||mercadoclics.com^$third-party`, EasyPrivacy); 1 cookie 3ª parte (`_d2id`, 1 ano) | 39 bloqueios | **Divergência de definição.** `mercadoclics.com` é a plataforma de anúncios do próprio Mercado Livre (Mercado Ads): é 3ª parte por eTLD+1 e rastreia o usuário entre os sites do grupo, por isso EasyPrivacy a bloqueia; o plugin a trata como mesma organização. O cookie `_d2id` de 1 ano confirma que há identificação persistente — o plugin o exibe como "afiliado", mas não pontua. |
| `melidata` (`mercadolibre.com`, `mercadopago.com(.br)`, `mercadolivre.com`) | afiliados; pixels `/pixel.gif?` | 2 cookies 3ª parte (`mercadolibre.com`, `meli.com`) | 4 bloqueios `/pixel.gif?` | Mesma divergência: telemetria própria distribuída em vários eTLD+1 do grupo. O uBlock bloqueia pelo padrão genérico de pixel. |
| `accounts.google.com`, `gstatic.com` | não listados (2 domínios, −2) | `accounts.google.com` contactado | `/log?format=` bloqueado | Concordam; é o botão "Entrar com Google" dentro de iframe. |
| Ad trackers | 1 | 0 (texto) / 2 domínios (JSON) | 46 bloqueios, 39 no `mercadoclics` | Os três concordam que **não há rede de anúncios de terceiros**; toda a diferença está em como classificar os domínios do próprio grupo. |
| Cookies de 3ª parte | 0 (3 marcados como afiliados) | 3 | — | Idem. |
| Key logging | não (3 listeners em iframe do Google, descartados) | não | — | Concordam — e o descarte dos listeners em iframe evitou um falso positivo. |

## 3.5 Síntese da reconciliação

1. **Onde as fontes concordam:** presença/ausência de gravação de sessão (Hotjar no ML), de GAM/Google remarketing
   (UOL, Terra), dos rastreadores de analytics (comScore, Chartbeat, Newsroom, Permutive) e a ausência de
   fingerprinting por canvas nos três sites.
2. **Divergência de volume (UOL, Terra):** o Blacklight viu o leilão programático completo (80+ SSPs/DSPs, 270–310
   cookies); o nosso Firefox carregou GPT/Prebid mas o leilão não rodou. Automação e consentimento foram testados e
   descartados com HARs próprios; a explicação restante é a **origem do tráfego** (EUA × Brasil) somada à **2ª página**
   visitada pelo Blacklight.
3. **Divergência de definição (os três):** domínios do próprio grupo (`jsuol.com.br`, `trrsf.com`, `mercadoclics.com`,
   `melidata`) são rastreadores para EasyPrivacy/Blacklight e afiliados para o plugin.
4. **Divergência de critério (UOL):** o plugin marca *key logging* pela capacidade (listener de teclado de terceiro no
   frame principal); o Blacklight, pela exfiltração observada. O caso Marfeel ilustra a diferença.
5. **Só o plugin vê:** cookie sync explícito (`google_cm` Permutive↔Google), polling regular (`events.newsroom.bi`),
   storage em iframes de 3ª parte (YouTube), sobrescrita de nativos e novos globais (Terra).
6. **Só o uBlock vê:** bloqueios por *scriptlet* (anúncios do player do YouTube) e *redirects* para stubs, que não são
   requisições e por isso não aparecem no HAR nem no plugin.
