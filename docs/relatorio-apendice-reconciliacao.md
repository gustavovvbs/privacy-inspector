# Apêndice — Reconciliação domínio a domínio

Uma linha por eTLD+1 observado por qualquer das fontes (plugin, Blacklight, uBlock Origin, HAR). "BL req." = requisições que o Blacklight classificou como *TrackingRequest*; "BL ck" = cookies de 3ª parte desse domínio no Blacklight; "uBO" = bloqueios de rede do uBlock; "HAR" = entradas no HAR da visita do plugin. Gerado por `tools/build_appendix.py` a partir de `reconciliacao.json`.

**Nota A (leilão programático).** Os domínios marcados "Só BL … nota A" não têm nenhuma requisição no HAR da visita do plugin: são SSPs, DSPs, verificadores e serviços de cookie sync que só são contactados quando o leilão do Google Ad Manager/Prebid roda. No Blacklight o leilão rodou (UOL: 13 `gampad/ads`, 69 `googlesyndication.com`, 181 req. em `usync.html`; Terra: 15 `gampad/ads`, 70 `googlesyndication.com`, 79 em `CookieSync.html`); no nosso Firefox o `gpt.js` e o `prebid.js` carregam mas nenhum `gampad/ads` é emitido, com ou sem `navigator.webdriver` oculto e com ou sem consentimento aceito (HARs em `uol-sem-webdriver/` e `uol-com-consentimento/`). Ver seção 3.2.

**Nota B (afiliados).** Domínios do mesmo grupo empresarial da página (CDN, tag manager, telemetria, ad server próprio). Para EasyPrivacy (uBlock, Blacklight) são 3ª parte por eTLD+1; o plugin os rotula "afiliado" e não os pontua (seção 4).


## uol.com.br — 160 domínios

| Domínio | Plugin | BL req. / ck | uBO | HAR | Explicação |
|---|---|---|---|---|---|
| `imguol.com.br` | 40 req. (afiliado) | 2 / 0 | 1 | 69 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `jsuol.com.br` | 36 req. (afiliado) | 48 / 1 | 10 | 36 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `youtube.com` | 25 req., advertising | 5 / 0 | 8 | 26 | Concordam. HAR: 26 req. (image/jpeg 3, text/javascript 10). embed do YouTube. |
| `newsroom.bi` | 24 req., analytics | 27 / 4 | 0 | 24 | Concordam. HAR: 24 req. (application/json 23, application/x-unknown-content-type 1). uBO sem filtro. analytics Newsroom AI. |
| `uol.com.br` | — | 0 / 0 (não contactado) | 1 | 36 | **Só o uBlock.** Bloqueado antes de sair (não há requisição no HAR do plugin). |
| `uol.com` | 10 req. (afiliado) | 0 / 0 | 0 | 10 | Afiliado (CDN/serviço do grupo); não pontua. BL e uBO não marcam. |
| `privacymanager.io` | 6 req., identity | 0 / 0 | 0 | 6 | Concordam. HAR: 6 req. (text/javascript 1, application/x-javascript 1). uBO sem filtro. CMP/ATS LiveRamp. |
| `doubleclick.net` | 6 req., advertising | 66 / 1 | 10 | 6 | Concordam. HAR: 6 req. (application/javascript 3, image/gif 1). Google Ad Manager. |
| `permutive.com` | 6 req., analytics | 19 / 0 | 0 | 6 | Concordam. HAR: 6 req. (text/xml 4, ? 1). uBO sem filtro. DMP Permutive. |
| `gstatic.com` | 6 req. | 7 / 0 | 0 | 6 | Concordam. HAR: 6 req. (text/html 3, image/png 1). Não listado no plugin (1 pt). |
| `googleapis.com` | 6 req. | 6 / 0 | 5 | 6 | Concordam. HAR: 6 req. (application/javascript 3, application/json+protobuf 2). Não listado no plugin (1 pt). |
| `google.com` | 5 req. | 16 / 0 | 0 | 5 | Concordam. HAR: 5 req. (? 2, application/javascript 1). Não listado no plugin (1 pt). |
| `mrf.io` | 3 req., analytics | 0 / 0 | 1 | 3 | Concordam. HAR: 3 req. (application/javascript 3). SDK Marfeel. |
| `chartbeat.com` | 2 req., analytics | 10 / 0 | 3 | 2 | Concordam. HAR: 2 req. (application/javascript 2). analytics Chartbeat. |
| `googletagmanager.com` | 2 req., analytics | 4 / 0 | 0 | 2 | Concordam. HAR: 2 req. (application/javascript 2). uBO sem filtro. Google Tag Manager. |
| `ytimg.com` | 2 req., advertising | 0 / 0 | 0 | 2 | Concordam. HAR: 2 req. (image/jpeg 2). uBO sem filtro. |
| `adnxs.com` | 2 req., advertising | 43 / 4 | 0 | 2 | Concordam. HAR: 2 req. (application/x-unknown-content-type 1, text/xml 1). uBO sem filtro. Xandr (Prebid). |
| `jsuol.com` | 1 req. (afiliado) | 0 / 0 | 0 | 2 | Afiliado (CDN/serviço do grupo); não pontua. BL e uBO não marcam. |
| `turner.com` | 1 req. | 1 / 0 | 0 | 1 | Concordam. HAR: 1 req. (application/javascript 1). Não listado no plugin (1 pt). |
| `permutive.app` | 1 req., analytics | 7 / 0 | 1 | 1 | Concordam. HAR: 1 req. (application/javascript 1). |
| `amazon-adsystem.com` | 1 req., advertising | 57 / 2 | 0 | 1 | Concordam. HAR: 1 req. (? 1). uBO sem filtro. Amazon TAM (apstag). |
| `scorecardresearch.com` | 1 req., analytics | 34 / 2 | 1 | 1 | Concordam. HAR: 1 req. (application/javascript 1). comScore. |
| `tinypass.com` | 1 req., analytics | 0 / 1 | 0 | 1 | Concordam. HAR: 1 req. (application/javascript 1). uBO sem filtro. Piano. |
| `prmutv.co` | 1 req., analytics | 0 / 0 | 0 | 1 | Concordam. HAR: 1 req. (application/json 1). uBO sem filtro. |
| `tapad.com` | — | 9 / 3 | 0 | 0 | Só BL, 0 no HAR — ID graph Tapad + cookies; nota A |
| `gumgum.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `crwdcntrl.net` | — | 4 / 1 | 0 | 0 | Só BL, 0 no HAR — DMP Lotame + cookies; nota A |
| `liadm.com` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — LiveIntent (identidade); nota A |
| `mgaru.dev` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `seedtag.com` | — | 29 / 4 | 0 | 0 | Só BL, 0 no HAR — SSP contextual + cookies; nota A |
| `outbrain.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `connectad.io` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `gvt1.com` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `serverbid.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `loopme.me` | — | 5 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `bidr.io` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `ctnsnet.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `ex.co` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `t13.io` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `yellowblue.io` | — | 9 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `sascdn.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `omnitagjs.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `brand-display.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `admanmedia.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mygaru.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `demdex.net` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — DMP Adobe + cookies; nota A |
| `on.aws` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `richaudience.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `taptapnetworks.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adform.net` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `facebook.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `undertone.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `fwmrm.net` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `clarity.ms` | — | 11 / 5 | 0 | 0 | Só BL, 0 no HAR — Microsoft Clarity (gravação de sessão) + cookies; nota A |
| `technoratimedia.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `turn.com` | — | 4 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `criteo.com` | — | 5 / 2 | 0 | 0 | Só BL, 0 no HAR — Criteo (Prebid) + cookies; nota A |
| `quantserve.com` | — | 4 / 2 | 0 | 0 | Só BL, 0 no HAR — Quantcast + cookies; nota A |
| `mxptint.net` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `emxdgt.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `pinterest.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `contextweb.com` | — | 6 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `taboola.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — recomendação paga + cookies; nota A |
| `openx.net` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — SSP OpenX + cookies; nota A |
| `smartadserver.com` | — | 36 / 7 | 0 | 0 | Só BL, 0 no HAR — SSP Equativ + cookies; nota A |
| `tracookiepixel.xyz` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `cognitivlabs.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `sonobi.com` | — | 6 / 20 | 0 | 0 | Só BL, 0 no HAR — SSP Sonobi + cookies; nota A |
| `syncingbridge.com` | — | 0 / 6 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `openxcdn.net` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `deepintent.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adstanding.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `temu.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `piano.io` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `id5-sync.com` | — | 14 / 2 | 0 | 0 | Só BL, 0 no HAR — ID universal (cookie sync) + cookies; nota A |
| `adgrx.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `krushmedia.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `everesttech.net` | — | 5 / 1 | 0 | 0 | Só BL, 0 no HAR — Adobe Advertising + cookies; nota A |
| `amspbs.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `sharethrough.com` | — | 7 / 1 | 0 | 0 | Só BL, 0 no HAR — SSP Sharethrough + cookies; nota A |
| `dv.tech` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `doubleverify.com` | — | 42 / 0 | 0 | 0 | Só BL, 0 no HAR — verificação de anúncios; nota A |
| `simpli.fi` | — | 4 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `a-mo.net` | — | 1 / 6 | 0 | 0 | Só BL, 0 no HAR — SSP AMO + cookies; nota A |
| `3lift.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — SSP TripleLift + cookies; nota A |
| `connatix.com` | — | 4 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `unrulymedia.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `betweendigital.com` | — | 2 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `pubmatic.com` | — | 11 / 17 | 0 | 0 | Só BL, 0 no HAR — SSP PubMatic + cookies; nota A |
| `onaudience.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `bttrack.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mathtag.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mediavine.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `adition.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `tribalfusion.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `1rx.io` | — | 5 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adtrafficquality.google` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `chartbeat.net` | — | 5 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `bfmio.com` | — | 8 / 9 | 0 | 0 | Só BL, 0 no HAR — SSP Beachfront + cookies; nota A |
| `33across.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `eqads.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `trustedstack.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `primis.tech` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `intentiq.com` | — | 0 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `cadent.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `opera.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `cootlogix.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `pmbmonetize.live` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `linkedin.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — LinkedIn Insight + cookies; nota A |
| `agkn.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — Neustar (identidade); nota A |
| `2mdn.net` | — | 19 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `nextmillmedia.com` | — | 0 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `facebook.net` | — | 4 / 0 | 0 | 0 | Só BL, 0 no HAR — pixel do Facebook; nota A |
| `onetag-sys.com` | — | 3 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `aralego.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `inmobi.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad network InMobi + cookies; nota A |
| `googlesyndication.com` | — | 69 / 0 | 0 | 0 | Só BL, 0 no HAR — entrega de anúncios do GAM (gampad/ads); nota A |
| `rtbhouse.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `acuityplatform.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `media.net` | — | 5 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `ipredictive.com` | — | 4 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `creativecdn.com` | — | 7 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rfihub.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `smaato.net` | — | 3 / 6 | 0 | 0 | Só BL, 0 no HAR — SSP Smaato + cookies; nota A |
| `sitescout.com` | — | 5 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `ads-twitter.com` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — pixel do X; nota A |
| `storygize.net` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `google-analytics.com` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — Google Analytics; nota A |
| `cxense.com` | — | 9 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `lijit.com` | — | 6 / 2 | 0 | 0 | Só BL, 0 no HAR — SSP Sovrn + cookies; nota A |
| `adsrvr.org` | — | 10 / 2 | 0 | 0 | Só BL, 0 no HAR — DSP The Trade Desk + cookies; nota A |
| `im-apps.net` | — | 3 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `imguol.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `springserve.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `company-target.com` | — | 1 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `kargo.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rubiconproject.com` | — | 123 / 5 | 0 | 0 | Só BL, 0 no HAR — SSP Magnite (leilão + usync.html) + cookies; nota A |
| `yahoo.com` | — | 11 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `yieldmo.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `creative-serving.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `bidswitch.net` | — | 16 / 3 | 0 | 0 | Só BL, 0 no HAR — intermediação SSP↔DSP (cookie sync) + cookies; nota A |
| `rlcdn.com` | — | 5 / 2 | 0 | 0 | Só BL, 0 no HAR — LiveRamp (identidade) + cookies; nota A |
| `smilewanted.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `aniview.com` | — | 1 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `semasio.net` | — | 9 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `t.co` | — | 5 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mgid.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `minutemedia-prebid.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `stackadapt.com` | — | 5 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `startappnetwork.com` | — | 0 / 7 | 0 | 0 | Só BL, 0 no HAR — ad network Start.io + cookies; nota A |
| `bidtheatre.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `dotomi.com` | — | 11 / 3 | 0 | 0 | Só BL, 0 no HAR — DSP Epsilon/Conversant + cookies; nota A |
| `360yield.com` | — | 5 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `blismedia.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `shb-sync.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `twitter.com` | — | 6 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `casalemedia.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — SSP Index Exchange + cookies; nota A |
| `appier.net` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `criteo.net` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `bing.com` | — | 1 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |

## terra.com.br — 151 domínios

| Domínio | Plugin | BL req. / ck | uBO | HAR | Explicação |
|---|---|---|---|---|---|
| `trrsf.com` | 176 req. (afiliado) | 4 / 0 | 4 | 185 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `trrsf.com.br` | 13 req. (afiliado) | 10 / 0 | 4 | 13 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `privacymanager.io` | 6 req., identity | 0 / 0 | 0 | 6 | Concordam. HAR: 6 req. (text/javascript 1, application/x-javascript 1). uBO sem filtro. CMP/ATS LiveRamp. |
| `criteo.com` | 2 req., advertising | 30 / 2 | 0 | 2 | Concordam. HAR: 2 req. (application/x-unknown-content-type 2). uBO sem filtro. Criteo (Prebid). |
| `tailtarget.com` | 1 req., advertising | 30 / 8 | 3 | 1 | Concordam. HAR: 1 req. (application/javascript 1). DMP Tail (BR). |
| `chartbeat.com` | 1 req., analytics | 4 / 0 | 2 | 1 | Concordam. HAR: 1 req. (application/javascript 1). analytics Chartbeat. |
| `taboola.com` | 1 req., advertising | 6 / 2 | 2 | 1 | Concordam. HAR: 1 req. (application/javascript 1). recomendação paga. |
| `amazon-adsystem.com` | 1 req., advertising | 71 / 2 | 2 | 1 | Concordam. HAR: 1 req. (? 1). Amazon TAM (apstag). |
| `scorecardresearch.com` | 1 req., analytics | 14 / 2 | 1 | 1 | Concordam. HAR: 1 req. (application/javascript 1). comScore. |
| `googletagmanager.com` | 1 req., analytics | 16 / 0 | 2 | 1 | Concordam. HAR: 1 req. (application/javascript 1). Google Tag Manager. |
| `doubleclick.net` | 1 req., advertising | 89 / 1 | 2 | 1 | Concordam. HAR: 1 req. (application/javascript 1). Google Ad Manager. |
| `rlcdn.com` | 1 req., identity | 7 / 2 | 0 | 1 | Concordam. HAR: 1 req. (application/x-unknown-content-type 1). uBO sem filtro. LiveRamp (identidade). |
| `google.com` | 1 req. | 21 / 0 | 1 | 1 | Concordam. HAR: 1 req. (application/javascript 1). Não listado no plugin (1 pt). |
| `tapad.com` | — | 14 / 3 | 0 | 0 | Só BL, 0 no HAR — ID graph Tapad + cookies; nota A |
| `gumgum.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `crwdcntrl.net` | — | 4 / 0 | 0 | 0 | Só BL, 0 no HAR — DMP Lotame; nota A |
| `seedtag.com` | — | 2 / 3 | 0 | 0 | Só BL, 0 no HAR — SSP contextual + cookies; nota A |
| `wp.pl` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `outbrain.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `connectad.io` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `presage.io` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `lkqd.net` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `loopme.me` | — | 9 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `visx.net` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `bidr.io` | — | 8 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `liftdsp.com` | — | 0 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `ctnsnet.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `a-mx.com` | — | 0 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `yellowblue.io` | — | 13 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `jsdelivr.net` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `sascdn.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `omnitagjs.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `admanmedia.com` | — | 7 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `demdex.net` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — DMP Adobe + cookies; nota A |
| `richaudience.com` | — | 6 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `gamoshi.io` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `adform.net` | — | 10 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `advolve.io` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mfadsrvr.com` | — | 2 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `fwmrm.net` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `technoratimedia.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `turn.com` | — | 6 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `quantserve.com` | — | 6 / 2 | 0 | 0 | Só BL, 0 no HAR — Quantcast + cookies; nota A |
| `mediagotechnology.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `emxdgt.com` | — | 5 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `contextweb.com` | — | 6 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `openx.net` | — | 18 / 2 | 0 | 0 | Só BL, 0 no HAR — SSP OpenX + cookies; nota A |
| `smartadserver.com` | — | 35 / 6 | 0 | 0 | Só BL, 0 no HAR — SSP Equativ + cookies; nota A |
| `sonobi.com` | — | 6 / 20 | 0 | 0 | Só BL, 0 no HAR — SSP Sonobi + cookies; nota A |
| `syncingbridge.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `openxcdn.net` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `deepintent.com` | — | 4 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adstanding.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `temu.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `id5-sync.com` | — | 21 / 2 | 0 | 0 | Só BL, 0 no HAR — ID universal (cookie sync) + cookies; nota A |
| `adentifi.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `krushmedia.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `marketiq.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `everesttech.net` | — | 8 / 1 | 0 | 0 | Só BL, 0 no HAR — Adobe Advertising + cookies; nota A |
| `sharethrough.com` | — | 15 / 1 | 0 | 0 | Só BL, 0 no HAR — SSP Sharethrough + cookies; nota A |
| `simpli.fi` | — | 5 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `a-mo.net` | — | 10 / 24 | 0 | 0 | Só BL, 0 no HAR — SSP AMO + cookies; nota A |
| `3lift.com` | — | 7 / 1 | 0 | 0 | Só BL, 0 no HAR — SSP TripleLift + cookies; nota A |
| `adroll.com` | — | 6 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `sparteo.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `connatix.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `unrulymedia.com` | — | 10 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `teads.tv` | — | 8 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adotmob.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `ymmobi.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `pubmatic.com` | — | 18 / 13 | 0 | 0 | Só BL, 0 no HAR — SSP PubMatic + cookies; nota A |
| `bttrack.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mathtag.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adition.com` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `tribalfusion.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rtb-oveeo.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `1rx.io` | — | 23 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adtrafficquality.google` | — | 3 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `chartbeat.net` | — | 4 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `bfmio.com` | — | 6 / 8 | 0 | 0 | Só BL, 0 no HAR — SSP Beachfront + cookies; nota A |
| `33across.com` | — | 6 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `digitaleast.mobi` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `trustedstack.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `cloudflare.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `cadent.com` | — | 0 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `opera.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `cootlogix.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `iqm.com` | — | 1 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `thecas.xyz` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `pmbmonetize.live` | — | 0 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `linkedin.com` | — | 3 / 3 | 0 | 0 | Só BL, 0 no HAR — LinkedIn Insight + cookies; nota A |
| `2mdn.net` | — | 2 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `nextmillmedia.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `onetag-sys.com` | — | 4 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `googlesyndication.com` | — | 70 / 0 | 0 | 0 | Só BL, 0 no HAR — entrega de anúncios do GAM (gampad/ads); nota A |
| `rtbhouse.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `anyrtb.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `acuityplatform.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `media.net` | — | 5 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `ipredictive.com` | — | 3 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `eskimi.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `creativecdn.com` | — | 6 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rfihub.com` | — | 3 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `smaato.net` | — | 7 / 10 | 0 | 0 | Só BL, 0 no HAR — SSP Smaato + cookies; nota A |
| `ads-tinyorbit.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `moloco.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `sitescout.com` | — | 9 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `google-analytics.com` | — | 7 / 0 | 0 | 0 | Só BL, 0 no HAR — Google Analytics; nota A |
| `tynt.com` | — | 2 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adsmovil.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `disqus.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `lijit.com` | — | 12 / 2 | 0 | 0 | Só BL, 0 no HAR — SSP Sovrn + cookies; nota A |
| `adsrvr.org` | — | 22 / 2 | 0 | 0 | Só BL, 0 no HAR — DSP The Trade Desk + cookies; nota A |
| `smartclip.net` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `sportradarserving.com` | — | 2 / 5 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `springserve.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `company-target.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `kargo.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rtbwise.com` | — | 0 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `rubiconproject.com` | — | 61 / 5 | 0 | 0 | Só BL, 0 no HAR — SSP Magnite (leilão + usync.html) + cookies; nota A |
| `yahoo.com` | — | 9 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `altitude-arena.com` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `yieldmo.com` | — | 3 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `gstatic.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `bidswitch.net` | — | 36 / 4 | 0 | 0 | Só BL, 0 no HAR — intermediação SSP↔DSP (cookie sync) + cookies; nota A |
| `adtelligent.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `chocolateplatform.com` | — | 0 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `semasio.net` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `mgid.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `eyeota.net` | — | 4 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `lunamedia.live` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adkernel.com` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `minutemedia-prebid.com` | — | 2 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `uncn.jp` | — | 1 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `adnxs.com` | — | 30 / 5 | 0 | 0 | Só BL, 0 no HAR — Xandr (Prebid) + cookies; nota A |
| `stackadapt.com` | — | 8 / 4 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `startappnetwork.com` | — | 0 / 8 | 0 | 0 | Só BL, 0 no HAR — ad network Start.io + cookies; nota A |
| `com.tr` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `googleapis.com` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `measureadv.com` | — | 0 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `krxd.net` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `smartytouch.co` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `audima.co` | — | 0 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `dotomi.com` | — | 18 / 3 | 0 | 0 | Só BL, 0 no HAR — DSP Epsilon/Conversant + cookies; nota A |
| `360yield.com` | — | 12 / 3 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `blismedia.com` | — | 5 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `tappx.com` | — | 0 / 22 | 0 | 0 | Só BL, 0 no HAR — SSP Tappx + cookies; nota A |
| `casalemedia.com` | — | 19 / 3 | 0 | 0 | Só BL, 0 no HAR — SSP Index Exchange + cookies; nota A |
| `appier.net` | — | 1 / 2 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |
| `criteo.net` | — | 1 / 0 | 0 | 0 | Só BL, 0 no HAR — ad-tech; nota A |
| `rqtrk.eu` | — | 1 / 1 | 0 | 0 | Só BL, 0 no HAR — ad-tech + cookies; nota A |

## mercadolivre.com.br — 11 domínios

| Domínio | Plugin | BL req. / ck | uBO | HAR | Explicação |
|---|---|---|---|---|---|
| `mlstatic.com` | 182 req. (afiliado) | 0 / 0 | 0 | 233 | Afiliado (CDN/serviço do grupo); não pontua. BL e uBO não marcam. |
| `mercadolibre.com` | 24 req. (afiliado) | 0 / 1 | 1 | 25 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `meli.com` | 17 req. (afiliado) | 0 / 1 | 0 | 19 | Afiliado (CDN/serviço do grupo); não pontua. BL e uBO não marcam. |
| `mercadoclics.com` | 15 req. (afiliado) | 20 / 1 | 39 | 15 | Afiliado (Mercado Ads (grupo ML)); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `google.com` | 6 req. | 0 / 0 | 1 | 6 | Concordam. HAR: 6 req. (application/javascript 1, text/css 1). Não listado no plugin (1 pt). |
| `mercadolivre.com.br` | — | 0 / 0 (não contactado) | 1 | 4 | **Só o uBlock.** Bloqueado antes de sair (não há requisição no HAR do plugin). |
| `gstatic.com` | 1 req. | 0 / 0 (não contactado) | 0 | 1 | Só plugin/HAR (1 req.); BL não contactou (variação entre visitas). |
| `hotjar.com` | 1 req., session-recording | 3 / 0 | 1 | 1 | Concordam. HAR: 1 req. (application/javascript 1). Hotjar (gravação de sessão). |
| `mercadopago.com.br` | 1 req. (afiliado) | 0 / 0 (não contactado) | 1 | 1 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `mercadopago.com` | 1 req. (afiliado) | 0 / 0 (não contactado) | 1 | 1 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
| `mercadolivre.com` | 1 req. (afiliado) | 0 / 0 (não contactado) | 1 | 1 | Afiliado (CDN/serviço do grupo); não pontua. BL/uBO tratam como 3ª parte (eTLD+1); nota B. |
