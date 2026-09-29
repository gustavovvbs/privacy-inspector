"""Carrega o site com o uBlock Origin (instalado temporariamente a partir de evidencias/_tools/ublock_origin.xpi)
e salva o que ele bloqueou, usando a exportação do próprio Logger do uBlock.
Uso: .venv/bin/python tools/capture_ublock.py https://www.exemplo.com.br [pasta]
Saída: evidencias/sites/<pasta>/ublock-logger.txt (export bruto), ublock.json (bloqueios parseados),
       ublock.png (logger) e ublock-popup.png (painel do uBlock para a aba).
"""
import sys, time, json, os, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

UBO_ID = 'uBlock0@raymondhill.net'
UBO_UUID = '1d2e3f40-0000-4000-8000-ab10cc000001'
XPI = harness.ROOT / 'evidencias' / '_tools' / 'ublock_origin.xpi'


def base_domain(host):
    return harness.baseDomain(host) if hasattr(harness, 'baseDomain') else host


def parse_logger(raw):
    """Separa, no export do Logger: bloqueios de rede (filtro de rede sem exceção), redirecionamentos
    (filtro com redirect-rule: a requisição é bloqueada e substituída por um stub neutro), exceções (@@),
    scriptlets/cosméticos (##+js, #@#) e requisições permitidas."""
    blocked, allowed, exceptions, scriptlets, redirects = [], 0, 0, [], 0
    for line in raw.splitlines():
        cols = [c.strip() for c in line.split('\t')]
        if len(cols) < 3:
            continue
        filt = next((c for c in cols[1:] if c and (c.startswith('||') or c.startswith('|') or c.startswith('/') or c.startswith('@@') or c.startswith('*') or c.startswith('##') or c.startswith('#@#') or '$' in c)), '')
        if filt.startswith('##') or filt.startswith('#@#'):
            scriptlets.append({'filter': filt[:120], 'context': cols[-1][:80]})
            continue
        if len(cols) < 5 or not cols[-1].startswith('http'):
            continue
        u = cols[-1]; typ = cols[-2]; method = cols[-3]
        if filt.startswith('@@'):
            exceptions += 1
        elif filt:
            if 'redirect-rule=' in filt or 'redirect=' in filt:
                redirects += 1
            blocked.append({'filter': filt, 'type': typ, 'method': method, 'url': u, 'host': harness.hostnameOf(u), 'redirected': 'redirect' in filt})
        else:
            allowed += 1
    return blocked, allowed, exceptions, scriptlets, redirects


def reparse(folder):
    out = harness.ROOT / 'evidencias' / 'sites' / folder
    raw = (out / 'ublock-logger.txt').read_text()
    blocked, allowed, exceptions, scriptlets, redirects = parse_logger(raw)
    summary = json.loads((out / 'ublock.json').read_text())
    by_domain = {}
    for b in blocked:
        k = base_domain(b['host']); by_domain[k] = by_domain.get(k, 0) + 1
    summary.update({'blocked': blocked, 'blockedCount': len(blocked), 'redirectedCount': redirects, 'allowedCount': allowed, 'exceptionsCount': exceptions,
                    'scriptlets': scriptlets, 'blockedByDomain': dict(sorted(by_domain.items(), key=lambda kv: -kv[1]))})
    (out / 'ublock.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(folder, 'bloqueios de rede', len(blocked), '(redirecionados', redirects, ') permitidas', allowed, 'exceções', exceptions, 'scriptlets', len(scriptlets), summary['blockedByDomain'])


def main(url, folder=None):
    host = harness.hostnameOf(url)
    name = folder or host.replace('www.', '')
    out = harness.ROOT / 'evidencias' / 'sites' / name
    out.mkdir(parents=True, exist_ok=True)
    opts = Options(); opts.binary_location = harness.FIREFOX_BIN
    opts.add_argument('--width=1200'); opts.add_argument('--height=1000')
    opts.set_preference('extensions.webextensions.uuids', json.dumps({UBO_ID: UBO_UUID}))
    opts.set_preference('privacy.trackingprotection.enabled', False)
    opts.set_preference('network.cookie.cookieBehavior', 0)
    d = webdriver.Firefox(options=opts, service=Service(log_output=os.devnull, service_args=['--allow-system-access']))
    try:
        d.install_addon(str(XPI), temporary=True)
        time.sleep(10)  # listas de filtros padrão são carregadas/compiladas
        harness.open_ext_tab(d, f'moz-extension://{UBO_UUID}/logger-ui.html#_')
        logger = d.window_handles[-1]
        d.switch_to.window(logger); time.sleep(2)
        d.switch_to.new_window('tab'); site = d.current_window_handle
        d.get(url); time.sleep(8)
        for y in (600, 1400, 2400, 0):
            d.execute_script(f'window.scrollTo(0, {y})'); time.sleep(1.5)
        time.sleep(10)
        d.switch_to.window(logger); time.sleep(1)
        tab_value = d.execute_script("""
          const sel = document.querySelector('#pageSelector');
          const opt = [...sel.options].find(o => /^\\d+$/.test(o.value) && o.value !== '0');
          if (!opt) return null;
          sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true }));
          return opt.value;
        """)
        time.sleep(1.5)
        harness.shoot_full(d, out / 'ublock.png')
        raw = d.execute_script("""
          document.querySelector('#loggerExport').click();
          const dlg = document.querySelector('#loggerExportDialog');
          dlg.querySelector('[data-radio-item=table]').click();
          dlg.querySelector('[data-radio-item=plain]').click();
          return dlg.querySelector('textarea').value;
        """)
        # a troca de formato pode ser assíncrona: relê após um instante
        time.sleep(1)
        raw2 = d.execute_script("return document.querySelector('#loggerExportDialog textarea').value")
        raw = raw2 if raw2 and len(raw2) >= len(raw) else raw
        (out / 'ublock-logger.txt').write_text(raw)
        blocked, allowed, exceptions, scriptlets, redirects = parse_logger(raw)
        # painel do uBlock para a aba
        if tab_value:
            harness.open_ext_tab(d, f'moz-extension://{UBO_UUID}/popup-fenix.html?tabId={tab_value}')
            d.switch_to.window(d.window_handles[-1]); time.sleep(2)
            try:
                d.execute_script("const m = document.querySelector('#moreButton, .fa-icon_angle-up'); if (m) m.click();"); time.sleep(1)
            except Exception:
                pass
            harness.shoot_full(d, out / 'ublock-popup.png')
            popup_txt = d.execute_script('return document.body.innerText')
            (out / 'ublock-popup.txt').write_text(popup_txt)
        by_domain = {}
        for b in blocked:
            k = base_domain(b['host']); by_domain[k] = by_domain.get(k, 0) + 1
        summary = {'site': url, 'blocked': blocked, 'blockedCount': len(blocked), 'redirectedCount': redirects, 'allowedCount': allowed, 'exceptionsCount': exceptions, 'scriptlets': scriptlets,
                   'blockedByDomain': dict(sorted(by_domain.items(), key=lambda kv: -kv[1])), 'ublockVersion': '1.75.0', 'lists': 'padrão (uBlock filters, EasyList, EasyPrivacy, Peter Lowe, malware)'}
        (out / 'ublock.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
        print(name, 'uBlock: bloqueadas', len(blocked), 'permitidas', allowed, 'domínios', list(by_domain.items())[:12])
    finally:
        d.quit()


if __name__ == '__main__':
    if sys.argv[1] == '--reparse':
        for f in sys.argv[2:]:
            reparse(f)
    else:
        main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
