# Entregável 4 — Pontuação de privacidade aplicada aos 3 sites

A metodologia (critérios, pesos, tetos e justificativas) está na seção anterior. Abaixo, a composição da nota de
cada site (aba "Resumo" do plugin, arquivo `relatorio-plugin-summary.png` em `evidencias/sites/` de cada site) e a comparação
crítica com o Blacklight.

| Critério (teto) | UOL | Terra | Mercado Livre |
|---|---|---|---|
| Rastreadores conhecidos, 4/domínio (32) | 15 → **−32** | 10 → **−32** | 1 → −4 |
| Outros domínios de 3ª parte, 1/domínio (8) | 4 → −4 | 1 → −1 | 2 → −2 |
| Cookies de 3ª parte, 2/cookie (16) | 10 → **−16** | 0 | 0 |
| Cookies persistentes > 1 ano, 1/cookie (6) | 1 → −1 | 1 → −1 | 5 → −5 |
| Fingerprinting (15/7) | possível → −7 | 0 | 0 |
| Gravação de sessão (10) | 0 | 0 | Hotjar → **−10** |
| Captura de teclado por rastreador (10) | Marfeel → **−10** | 0 | 0 |
| Pixel do Facebook (6) | 0 | 0 | 0 |
| Remarketing Google (4) | −4 | −4 | 0 |
| Cookie sync (8/4) | Permutive↔Google → **−8** | 0 | 0 |
| Bounce tracking (6) | 0 | 0 | 0 |
| Storage em frame de 3ª parte (4) | YouTube → −4 | 0 | 0 |
| Hijacking (15/8/3) | alto → **−15** | baixo → −3 | 0 |
| **Soma das deduções** | 101 | 41 | 21 |
| **Nota / conceito** | **0 — E** | **59 — C** | **79 — B** |

## Comparação crítica com o Blacklight

O Blacklight não dá nota; lista indicadores e os compara com a média dos 100 mil sites mais populares. A comparação
é feita indicador a indicador:

| Indicador | UOL (plugin × Blacklight) | Terra | Mercado Livre |
|---|---|---|---|
| Ad trackers | 15 × **88** | 10 × **83** | 1 × 0 (2 domínios no JSON) |
| Cookies de 3ª parte | 10 × **271** | 0 × **310** | 0 × 3 |
| Canvas fingerprinting | não × não | não × não | não × não |
| Session recording | não × não | não × não | **Hotjar × Hotjar** |
| Key logging | **sim (Marfeel) × não** | não × não | não × não |
| FB pixel | **não × sim** | não × não | não × não |
| GA remarketing | sim × sim | sim × sim | não × não |

**Onde concordam.** Nos indicadores qualitativos de maior peso — gravação de sessão, canvas, remarketing Google — as
duas ferramentas chegam ao mesmo veredito nos três sites. A ordenação também coincide: UOL e Terra são muito mais
invasivos que o Mercado Livre em ambas.

**Onde divergem e por quê.**

1. *Volume de rastreadores e cookies (UOL, Terra).* A diferença de uma ordem de grandeza (15 × 88; 10 × 271) não é
   de detecção: os 136/138 domínios que só o Blacklight viu não estão no HAR. O leilão programático não rodou na
   nossa visita (seção 3.2), e o Blacklight ainda visita uma segunda página. **Consequência para a nota:** o plugin
   já dá 0 (E) ao UOL com o que viu; com o tráfego do Blacklight a dedução por rastreadores e cookies já estaria no
   teto de qualquer forma — os tetos por critério fazem a nota saturar cedo. Para o Terra, o mesmo tráfego levaria a
   nota de 59 (C) para cerca de 40 (D), pelos 16 pontos de cookies de 3ª parte que hoje são zero.
2. *Key logging (UOL).* Critérios diferentes: capacidade (plugin) × exfiltração observada (Blacklight). O plugin é
   mais sensível e menos específico; por isso o peso (10) só se aplica quando o script é um rastreador conhecido no
   frame principal — o que ainda assim pune a Marfeel por um listener de engajamento. É a dedução mais discutível
   da nota do UOL; sem ela, e sem o "hijacking alto" que ela dispara (15), o UOL teria 25 (E) — o conceito não muda.
3. *FB pixel (UOL).* O Blacklight viu `facebook.net`; o HAR não tem. É parte do mesmo fluxo de anúncios/2ª página.
4. *Afiliados (Mercado Livre).* O Blacklight conta `mercadoclics.com`, `mercadolibre.com` e `meli.com` como
   terceiros (3 cookies); o plugin os trata como mesma organização e o ML fica com 0 cookies de 3ª parte. Se a
   convenção do Blacklight fosse adotada, o ML perderia 6 pontos (3 cookies) e mais 4 (mercadoclics como rastreador),
   caindo para 69 (C). A escolha do plugin é deliberada: a nota mede rastreamento *entre organizações*; o
   rastreamento *dentro* do grupo continua visível na interface (rótulo "afiliado"), mas não pontua.
5. *O que o Blacklight não mede.* Cookie sync explícito, polling, storage em iframes e alterações no ambiente JS
   (hijacking) entram só na nota do plugin. No UOL respondem por 27 dos 101 pontos deduzidos.

**Limites da metodologia.** (a) A nota depende do que a visita disparou — sem leilão de anúncios, sites de mídia
parecem menos invasivos do que são para um visitante estrangeiro. (b) A lista interna de rastreadores é curada e
menor que a do DuckDuckGo/EasyPrivacy usada pelo Blacklight e pelo uBlock; domínios "não listados" pontuam pouco
(1 ponto). (c) Os tetos evitam que um único eixo domine, mas fazem a escala saturar: o UOL chega a 0 com folga, e
não é possível distinguir "muito invasivo" de "extremamente invasivo" abaixo desse ponto.
