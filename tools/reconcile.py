"""Reconciliação por site: plugin × Blacklight × uBlock Origin × HAR.
Uso: .venv/bin/python tools/reconcile.py uol.com.br terra.com.br mercadolivre.com.br
Gera evidencias/sites/<site>/reconciliacao.json e imprime um resumo por domínio.
"""
import json, sys, collections
from pathlib import Path
from urllib.parse import urlparse
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import ROOT, baseDomain


def load(site):
    d = ROOT / 'evidencias' / 'sites' / site
    plugin = json.loads((d / 'relatorio.json').read_text())
    har = json.loads((d / f'{site}.har').read_text())
    ubo = json.loads((d / 'ublock.json').read_text())
    bl = json.loads((d / 'blacklight-inspection.json').read_text())
    bltxt = (d / 'blacklight.txt').read_text()
    return d, plugin, har, ubo, bl, bltxt


def blacklight_summary(bl, bltxt):
    r = bl['reports']
    trackers = collections.Counter()
    for t in r.get('third_party_trackers', []):
        trackers[baseDomain(urlparse(t['url']).hostname or '')] += 1
    cookies3p = [c for c in r.get('cookies', []) if c.get('third_party')]
    ck_by_dom = collections.Counter(baseDomain(c['domain'].lstrip('.')) for c in cookies3p)
    canvas = r.get('canvas_fingerprinters', {}).get('fingerprinters', [])
    fonts = r.get('canvas_font_fingerprinters', {})
    kl = r.get('key_logging', {})
    sr = r.get('session_recorders', {})
    hosts3p = bl.get('hosts', {}).get('requests', {}).get('third_party', [])
    def page_num(label):
        i = bltxt.find(label)
        if i < 0: return None
        seg = bltxt[max(0, i - 40):i]
        nums = [s for s in seg.split() if s.isdigit()]
        return int(nums[-1]) if nums else None
    return {
        'adTrackersPage': page_num('Ad trackers found'), 'thirdPartyCookiesPage': page_num('Third-party cookies found'),
        'trackerDomains': dict(trackers.most_common()), 'cookies3pByDomain': dict(ck_by_dom.most_common()), 'cookies3pCount': len(cookies3p),
        'canvasFingerprinters': canvas, 'fontFingerprinting': bool(fonts.get('canvas_font') or fonts.get('text_measure')),
        'keyLogging': list(kl.keys()) if isinstance(kl, dict) else kl, 'sessionRecorders': list(sr.keys()) if isinstance(sr, dict) else sr,
        'fbPixel': len(r.get('fb_pixel_events', [])) > 0, 'gaRemarketing': len(r.get('google_analytics_events', [])) > 0,
        'thirdPartyHosts': hosts3p, 'thirdPartyDomains': sorted({baseDomain(h) for h in hosts3p}),
        'visited': bl.get('start_time'), 'browser': bl.get('browser', {}).get('user_agent', '')[:80],
    }


def har_summary(har):
    by = {}
    for e in har['log']['entries']:
        h = urlparse(e['request']['url']).hostname
        if not h: continue
        d = baseDomain(h)
        x = by.setdefault(d, {'count': 0, 'hosts': set(), 'types': collections.Counter(), 'statuses': collections.Counter(), 'examples': [], 'setCookie': 0})
        x['count'] += 1; x['hosts'].add(h)
        mt = (e['response'].get('content', {}).get('mimeType') or '').split(';')[0]
        x['types'][mt or '?'] += 1; x['statuses'][e['response'].get('status')] += 1
        if any(hh['name'].lower() == 'set-cookie' for hh in e['response'].get('headers', [])): x['setCookie'] += 1
        if len(x['examples']) < 3: x['examples'].append(e['request']['url'][:120])
    for x in by.values():
        x['hosts'] = sorted(x['hosts']); x['types'] = dict(x['types']); x['statuses'] = {str(k): v for k, v in x['statuses'].items()}
    return by


def main(site):
    d, plugin, har, ubo, bl, bltxt = load(site)
    page = plugin['baseDomain']
    tp = plugin['thirdParties']
    bls = blacklight_summary(bl, bltxt)
    hs = har_summary(har)
    ubo_by = collections.defaultdict(lambda: {'count': 0, 'filters': collections.Counter(), 'types': collections.Counter()})
    for b in ubo['blocked']:
        k = baseDomain(b['host']); ubo_by[k]['count'] += 1; ubo_by[k]['filters'][b['filter']] += 1; ubo_by[k]['types'][b['type']] += 1
    domains = set(tp) | set(bls['thirdPartyDomains']) | set(bls['trackerDomains']) | set(ubo_by) | {k for k in hs if k != page}
    rows = []
    for dom in sorted(domains, key=lambda x: -(hs.get(x, {}).get('count', 0) + tp.get(x, {}).get('requests', 0))):
        p = tp.get(dom)
        rows.append({
            'domain': dom,
            'plugin': {'seen': bool(p), 'requests': p['requests'] if p else 0, 'tracker': p['tracker'] if p else None, 'owner': p.get('owner') if p else None,
                       'category': p['category'] if p else None, 'affiliated': p.get('affiliated') if p else None, 'types': p['types'] if p else {}} if p else {'seen': False},
            'blacklight': {'contacted': dom in bls['thirdPartyDomains'], 'trackerRequests': bls['trackerDomains'].get(dom, 0), 'cookies3p': bls['cookies3pByDomain'].get(dom, 0)},
            'ublock': {'blocked': ubo_by[dom]['count'] if dom in ubo_by else 0, 'filters': dict(ubo_by[dom]['filters'].most_common(3)) if dom in ubo_by else {}},
            'har': hs.get(dom, {'count': 0}),
        })
    out = {'site': site, 'plugin': {'score': plugin['score'], 'requestsTotal': plugin['requestsTotal'], 'thirdPartyDomains': [k for k, v in tp.items() if not v.get('affiliated')],
           'affiliatedDomains': [k for k, v in tp.items() if v.get('affiliated')], 'trackers': [k for k, v in tp.items() if v['tracker'] and not v.get('affiliated')],
           'cookies': {k: v for k, v in plugin['cookies']['summary'].items() if k != 'list'}, 'fingerprint': plugin['fingerprint']['level'], 'hijack': plugin['hijack']['level'],
           'keylog3p': [(l['event'], l['target'], l['scriptDomain'], l.get('tracker')) for l in plugin['hijack']['inputListeners'] if l['thirdParty'] and l['target'] == 'document'],
           'polling': [(p['url'][:80], p['count']) for p in plugin['hijack']['polling']], 'websockets': [(w['url'][:80], w['thirdParty']) for w in plugin['hijack']['websockets']],
           'cookieSync': [(e['kind'], e['param'], e['toDomain']) for e in plugin['cookieSync']['events']]},
           'blacklight': bls, 'ublock': {'blockedCount': ubo['blockedCount'], 'allowedCount': ubo['allowedCount'], 'byDomain': ubo['blockedByDomain']},
           'har': {'entries': len(har['log']['entries']), 'domains': len(hs)}, 'rows': rows}
    (d / 'reconciliacao.json').write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str))
    print(f"\n===== {site}: plugin {plugin['score']['score']} ({plugin['score']['grade']}) | HAR {len(har['log']['entries'])} entradas / {len(hs)} domínios | uBlock bloqueou {ubo['blockedCount']} | Blacklight: ad trackers {bls['adTrackersPage']}, cookies 3p {bls['thirdPartyCookiesPage']} ({bls['cookies3pCount']} no JSON), canvas {len(bls['canvasFingerprinters'])}, fontFP {bls['fontFingerprinting']}, keylog {bls['keyLogging']}, sessionRec {bls['sessionRecorders']}, fb {bls['fbPixel']}, ga {bls['gaRemarketing']}, hosts3p {len(bls['thirdPartyHosts'])}")
    print(' plugin:', json.dumps({k: out['plugin'][k] for k in ('trackers', 'affiliatedDomains', 'cookies', 'fingerprint', 'hijack', 'keylog3p', 'polling', 'websockets', 'cookieSync')}, ensure_ascii=False)[:1800])
    print(f" {'domínio':28} {'plugin':>7} {'cat':16} {'afil':4} {'BL-req':6} {'BL-trk':6} {'BL-ck':5} {'uBO':4} {'HAR':4}  filtros uBO / tipos HAR")
    for r in rows:
        p = r['plugin']; b = r['blacklight']; u = r['ublock']; h = r['har']
        print(f" {r['domain'][:28]:28} {p.get('requests', 0):7} {(p.get('category') or '-')[:16]:16} {'sim' if p.get('affiliated') else '':4} {'sim' if b['contacted'] else '':6} {b['trackerRequests']:6} {b['cookies3p']:5} {u['blocked']:4} {h.get('count', 0):4}  {list(u['filters'].keys())[:2]} {list((h.get('types') or {}).items())[:3]}")


if __name__ == '__main__':
    for s in sys.argv[1:]:
        main(s)
