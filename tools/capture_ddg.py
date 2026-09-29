"""Executa as DuckDuckGo Privacy Test Pages com o plugin carregado e salva as evidências em
evidencias/ddg/. Cada teste gera: NN-nome.png (página + abas do relatório), NN-nome.json (relatório do
plugin), NN-nome-pagina.txt (texto/resultados reportados pela própria página).

Uso: .venv/bin/python tools/capture_ddg.py [filtro-de-nome]
"""
import sys, time, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import start, capture, set_settings, ROOT
from selenium.webdriver.common.by import By

OUT = ROOT / 'evidencias' / 'ddg'
S = 'https://privacy-test-pages.site'


def click(driver, sel, wait=1.0):
    driver.find_element(By.CSS_SELECTOR, sel).click(); time.sleep(wait)


def storage_actions(d):
    click(d, '#store', 4); click(d, '#retrive', 4)


def partitioning_actions(d):
    # a página redireciona para www.first-party.site; esperar e rodar os testes
    time.sleep(3); click(d, '#run', 20)
    try: click(d, '#toggle-details', 1)
    except Exception: pass


def jsleaks_actions(d):
    d.execute_script("const s=document.querySelector('select'); if (s) { s.value=[...s.options].find(o=>/firefox/i.test(o.text)).value; s.dispatchEvent(new Event('change')); }")
    click(d, '#run', 5)


def link_click(text, wait=6):
    def act(d):
        d.find_element(By.PARTIAL_LINK_TEXT, text).click(); time.sleep(wait)
    return act


TESTS = [
    # (nome, url, ações, settle, abas do relatório)
    ('01-tracker-reporting-script', f'{S}/tracker-reporting/1major-via-script.html', None, 6, ('summary', 'trackers')),
    ('02-tracker-reporting-img', f'{S}/tracker-reporting/1major-via-img.html', None, 6, ('summary', 'trackers')),
    ('03-tracker-reporting-fetch', f'{S}/tracker-reporting/1major-via-fetch.html', None, 10, ('summary', 'trackers')),
    ('04-tracker-reporting-surrogate', f'{S}/tracker-reporting/1major-with-surrogate.html', None, 6, ('summary', 'trackers')),
    ('05a-tracker-blocking-sem-bloqueio', f'{S}/privacy-protections/request-blocking/', lambda d: click(d, '#start', 20), 5, ('summary', 'trackers', 'hijack')),
    ('05b-tracker-blocking-com-bloqueio', f'{S}/privacy-protections/request-blocking/', lambda d: click(d, '#start', 20), 5, ('summary', 'trackers')),
    ('06-storage-blocking', f'{S}/privacy-protections/storage-blocking/', storage_actions, 3, ('summary', 'storage', 'cookies')),
    ('07-storage-partitioning', 'https://www.first-party.site/privacy-protections/storage-partitioning/', partitioning_actions, 3, ('summary', 'storage', 'cookies')),
    ('08-fingerprinting', f'{S}/privacy-protections/fingerprinting/', lambda d: click(d, '#start', 12), 3, ('summary', 'fingerprint')),
    ('09-fingerprinting-canvas', f'{S}/privacy-protections/fingerprinting/canvas.html?run', None, 10, ('summary', 'fingerprint')),
    ('10-bounce-tracking', f'{S}/privacy-protections/bounce-tracking/', link_click('Go to privacy-test-pages.site', 8), 2, ('summary', 'sync', 'cookies')),
    ('11a-query-parameters-utm', f'{S}/privacy-protections/query-parameters/', link_click('utm_source and 1 standard', 4), 2, ('summary', 'sync')),
    ('11b-query-parameters-fbclid', f'{S}/privacy-protections/query-parameters/', link_click('fbclid', 4), 2, ('summary', 'sync')),
    ('12-js-leaks', f'{S}/security/js-leaks.html#firefox_92', lambda d: time.sleep(8), 2, ('summary', 'hijack')),
]

if __name__ == '__main__':
    flt = sys.argv[1] if len(sys.argv) > 1 else ''
    d = start()
    summary = {}
    try:
        set_settings(d, blocklist=[], block_known=False)
        for name, url, actions, settle, tabs in TESTS:
            if flt and flt not in name:
                continue
            if name.startswith('05b'):
                set_settings(d, blocklist=['bad.third-party.site'])
            print('>>', name, flush=True)
            try:
                r, txt = capture(d, url, OUT, name, actions=actions, settle=settle, report_tabs=tabs, title=name)
                if isinstance(r, dict):
                    summary[name] = {
                        'score': r['score']['score'], 'grade': r['score']['grade'],
                        'thirdParties': sorted(r['thirdParties'].keys()),
                        'trackers': [k for k, v in r['thirdParties'].items() if v.get('tracker')],
                        'blocked': r.get('blockedTotal', 0),
                        'cookies': {k: v for k, v in (r['cookies']['summary'] or {}).items() if k != 'list'},
                        'storage': {k: {'writes': v.get('writes', v.get('opens')), 'reads': v.get('reads'), 'keys': list((v.get('keys') or v.get('databases') or v.get('caches') or {}).keys())[:10], 'thirdPartyFrames': v['thirdPartyFrames']} for k, v in r['storage'].items() if k != 'events'},
                        'fingerprint': {'level': r['fingerprint']['level'], 'canvas': r['fingerprint']['canvas']['reads'], 'canvasLikely': r['fingerprint']['canvas']['likely'], 'webgl': r['fingerprint']['webgl']['calls'], 'audio': r['fingerprint']['audio']['calls'], 'measureText': r['fingerprint']['fonts']['measureText'], 'enumProps': len(r['fingerprint']['enumeration']['props'])},
                        'bounces': r['navigation']['bounces'], 'redirectChain': [(h['status'], h['fromDomain'], h['toDomain']) for h in r['navigation']['redirectChain']],
                        'cookieSync': [(e['kind'], e['param'], e['toDomain']) for e in r['cookieSync']['events']],
                        'queryParams': r['queryParams'],
                        'hijack': {'level': r['hijack']['level'], 'websockets': [w['url'] for w in r['hijack']['websockets']], 'polling': r['hijack']['polling'], 'overridden': r['hijack']['overridden'], 'newGlobalsCount': r['hijack']['newGlobalsCount'], 'newGlobals': r['hijack']['newGlobals'][:40], 'inputListeners3p': [l for l in r['hijack']['inputListeners'] if l['thirdParty']]},
                    }
                else:
                    summary[name] = {'error': str(r)}
            except Exception as e:
                print('   ERRO', repr(e)[:300]); summary[name] = {'error': repr(e)[:300]}
            if name.startswith('05b'):
                set_settings(d, blocklist=[])
    finally:
        d.quit()
    (OUT / '_resumo-plugin.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=1)[:20000])
