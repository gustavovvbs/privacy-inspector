"""Gera docs/relatorio-apendice-reconciliacao.md: tabela domínio a domínio (plugin × Blacklight × uBlock × HAR)
para cada site, com a explicação técnica de cada divergência, a partir de evidencias/sites/<site>/reconciliacao.json.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SITES = ['uol.com.br', 'terra.com.br', 'mercadolivre.com.br']

# Domínios cuja função é conhecida (para a explicação ficar específica, não genérica)
ROLE = {
    'rubiconproject.com': 'SSP Magnite (leilão + usync.html)', 'googlesyndication.com': 'entrega de anúncios do GAM (gampad/ads)',
    'smartadserver.com': 'SSP Equativ', 'pubmatic.com': 'SSP PubMatic', 'seedtag.com': 'SSP contextual', 'sonobi.com': 'SSP Sonobi',
    'bidswitch.net': 'intermediação SSP↔DSP (cookie sync)', 'id5-sync.com': 'ID universal (cookie sync)', 'adsrvr.org': 'DSP The Trade Desk',
    'doubleverify.com': 'verificação de anúncios', 'amazon-adsystem.com': 'Amazon TAM (apstag)', 'adnxs.com': 'Xandr (Prebid)',
    'criteo.com': 'Criteo (Prebid)', 'tailtarget.com': 'DMP Tail (BR)', 'taboola.com': 'recomendação paga', 'openx.net': 'SSP OpenX',
    'casalemedia.com': 'SSP Index Exchange', '3lift.com': 'SSP TripleLift', 'sharethrough.com': 'SSP Sharethrough', 'lijit.com': 'SSP Sovrn',
    'a-mo.net': 'SSP AMO', 'tappx.com': 'SSP Tappx', 'smaato.net': 'SSP Smaato', 'startappnetwork.com': 'ad network Start.io',
    'bfmio.com': 'SSP Beachfront', 'inmobi.com': 'ad network InMobi', 'dotomi.com': 'DSP Epsilon/Conversant', 'demdex.net': 'DMP Adobe',
    'crwdcntrl.net': 'DMP Lotame', 'tapad.com': 'ID graph Tapad', 'agkn.com': 'Neustar (identidade)', 'rlcdn.com': 'LiveRamp (identidade)',
    'liadm.com': 'LiveIntent (identidade)', 'everesttech.net': 'Adobe Advertising', 'quantserve.com': 'Quantcast', 'clarity.ms': 'Microsoft Clarity (gravação de sessão)',
    'facebook.net': 'pixel do Facebook', 'google-analytics.com': 'Google Analytics', 'permutive.com': 'DMP Permutive', 'newsroom.bi': 'analytics Newsroom AI',
    'chartbeat.com': 'analytics Chartbeat', 'scorecardresearch.com': 'comScore', 'googletagmanager.com': 'Google Tag Manager', 'doubleclick.net': 'Google Ad Manager',
    'youtube.com': 'embed do YouTube', 'hotjar.com': 'Hotjar (gravação de sessão)', 'mercadoclics.com': 'Mercado Ads (grupo ML)',
    'privacymanager.io': 'CMP/ATS LiveRamp', 'mrf.io': 'SDK Marfeel', 'tinypass.com': 'Piano', 'linkedin.com': 'LinkedIn Insight', 'ads-twitter.com': 'pixel do X',
}


def explain(site, row):
    d = row['domain']; p = row['plugin']; b = row['blacklight']; u = row['ublock']; h = row['har']
    seen = p.get('seen'); harn = h.get('count', 0)
    role = ROLE.get(d, '')
    if seen and p.get('affiliated'):
        return f"Afiliado ({role or 'CDN/serviço do grupo'}); não pontua. " + (f"BL/uBO tratam como 3ª parte (eTLD+1); nota B." if b['trackerRequests'] or u['blocked'] else "BL e uBO não marcam.")
    if seen and b['contacted']:
        base = f"Concordam. HAR: {harn} req. ({', '.join(f'{k} {v}' for k, v in list((h.get('types') or {}).items())[:2])})."
        if p.get('tracker') and not u['blocked']:
            base += " uBO sem filtro."
        if not p.get('tracker'):
            base += " Não listado no plugin (1 pt)."
        return base + (f" {role}." if role else '')
    if seen and not b['contacted']:
        return f"Só plugin/HAR ({harn} req.); BL não contactou (variação entre visitas). {role}".strip()
    if not seen and b['contacted']:
        sync = ' (cookie sync: Blacklight registrou cookies deste domínio)' if b['cookies3p'] else ''
        if site in ('uol.com.br', 'terra.com.br'):
            return f"Só BL, 0 no HAR — {role or 'ad-tech'}{' + cookies' if b['cookies3p'] else ''}; nota A"
        return f"Só BL, 0 no HAR. {role}{sync}"
    if not seen and not b['contacted'] and u['blocked']:
        return "**Só o uBlock.** Bloqueado antes de sair (não há requisição no HAR do plugin)."
    if not seen and harn:
        return "**Só no HAR.** Requisição de 1ª parte ou sem host (data:/blob:) — fora do escopo de terceiros do plugin."
    return "—"


def main():
    out = ['# Apêndice — Reconciliação domínio a domínio\n',
           'Uma linha por eTLD+1 observado por qualquer das fontes (plugin, Blacklight, uBlock Origin, HAR). "BL req." = requisições que o '
           'Blacklight classificou como *TrackingRequest*; "BL ck" = cookies de 3ª parte desse domínio no Blacklight; "uBO" = bloqueios de rede do '
           'uBlock; "HAR" = entradas no HAR da visita do plugin. Gerado por `tools/build_appendix.py` a partir de `reconciliacao.json`.\n',
           '**Nota A (leilão programático).** Os domínios marcados "Só BL … nota A" não têm nenhuma requisição no HAR da visita do plugin: são SSPs, DSPs, '
           'verificadores e serviços de cookie sync que só são contactados quando o leilão do Google Ad Manager/Prebid roda. No Blacklight o leilão rodou '
           '(UOL: 13 `gampad/ads`, 69 `googlesyndication.com`, 181 req. em `usync.html`; Terra: 15 `gampad/ads`, 70 `googlesyndication.com`, 79 em '
           '`CookieSync.html`); no nosso Firefox o `gpt.js` e o `prebid.js` carregam mas nenhum `gampad/ads` é emitido, com ou sem `navigator.webdriver` '
           'oculto e com ou sem consentimento aceito (HARs em `uol-sem-webdriver/` e `uol-com-consentimento/`). Ver seção 3.2.\n',
           '**Nota B (afiliados).** Domínios do mesmo grupo empresarial da página (CDN, tag manager, telemetria, ad server próprio). Para EasyPrivacy '
           '(uBlock, Blacklight) são 3ª parte por eTLD+1; o plugin os rotula "afiliado" e não os pontua (seção 4).\n']
    for site in SITES:
        rc = json.loads((ROOT / 'evidencias' / 'sites' / site / 'reconciliacao.json').read_text())
        rows = rc['rows']
        out.append(f"\n## {site} — {len(rows)} domínios\n")
        out.append('| Domínio | Plugin | BL req. / ck | uBO | HAR | Explicação |')
        out.append('|---|---|---|---|---|---|')
        for r in rows:
            p = r['plugin']
            if p.get('seen'):
                ptxt = f"{p['requests']} req." + (f", {p['category']}" if p.get('category') else '') + (' (afiliado)' if p.get('affiliated') else '')
            else:
                ptxt = '—'
            out.append(f"| `{r['domain']}` | {ptxt} | {r['blacklight']['trackerRequests']} / {r['blacklight']['cookies3p']}{'' if r['blacklight']['contacted'] else ' (não contactado)'} | {r['ublock']['blocked']} | {r['har'].get('count', 0)} | {explain(site, r)} |")
    (ROOT / 'docs' / 'relatorio-apendice-reconciliacao.md').write_text('\n'.join(out) + '\n')
    print('apêndice:', sum(len(json.loads((ROOT / 'evidencias' / 'sites' / s / 'reconciliacao.json').read_text())['rows']) for s in SITES), 'linhas')


if __name__ == '__main__':
    main()
