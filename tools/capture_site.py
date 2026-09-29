"""Coleta de evidências de um site real: HAR exportado pelo DevTools do Firefox (Network Monitor com
auto-export), print e JSON do relatório do plugin, tudo na mesma visita.

Uso: .venv/bin/python tools/capture_site.py https://www.exemplo.com.br [nome-da-pasta]
Saída: evidencias/sites/<dominio>/{<dominio>.har, relatorio.png (composição), relatorio.json, relatorio-plugin-<aba>.png, relatorio-pagina.png}
"""
import json, sys, time, shutil
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import harness
from harness import ROOT

HAR_DIR = ROOT / 'evidencias' / '_har'


def start_with_devtools(hide_webdriver=False):
    HAR_DIR.mkdir(parents=True, exist_ok=True)
    for f in HAR_DIR.glob('*.har'):
        f.unlink()
    d = harness.start(profile_prefs={
        'devtools.netmonitor.har.enableAutoExportToFile': True,
        'devtools.netmonitor.har.defaultLogDir': str(HAR_DIR),
        'devtools.netmonitor.har.includeResponseBodies': False,
        'devtools.netmonitor.har.forceExport': True,
        'devtools.netmonitor.persistlog': True,
        'devtools.toolbox.host': 'bottom',
        'devtools.chrome.enabled': True,
        'devtools.debugger.remote-enabled': True,
        # Esconde navigator.webdriver (Selenium expõe true; ad servers descartam tráfego automatizado)
        **({'dom.webdriver.enabled': False} if hide_webdriver else {}),
    })
    return d


def open_netmonitor(d):
    """Abre o Network Monitor na aba atual (necessário para o auto-export do HAR)."""
    d.set_context('chrome')
    try:
        d.execute_script("""
          const { require } = ChromeUtils.importESModule('resource://devtools/shared/loader/Loader.sys.mjs');
          const { gDevTools } = require('devtools/client/framework/devtools');
          const win = Services.wm.getMostRecentWindow('navigator:browser');
          gDevTools.showToolboxForTab(win.gBrowser.selectedTab, { toolId: 'netmonitor' });
        """)
    finally:
        d.set_context('content')
    time.sleep(3)


def export_har_via_console(d):
    """Obtém o HAR com tudo o que o Network Monitor registrou na visita (HarExporter.fetchHarData),
    sem diálogo de arquivo. Retorna a string JSON do HAR ou uma mensagem de erro."""
    d.set_context('chrome')
    try:
        return d.execute_async_script("""
          const done = arguments[arguments.length - 1];
          (async () => {
            const { require } = ChromeUtils.importESModule('resource://devtools/shared/loader/Loader.sys.mjs');
            const { gDevTools } = require('devtools/client/framework/devtools');
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            const toolbox = gDevTools.getToolboxForTab(win.gBrowser.selectedTab);
            const panel = toolbox && toolbox.getPanel('netmonitor');
            if (!panel) return done('sem painel');
            const { HarExporter } = panel.panelWin.windowRequire('devtools/client/netmonitor/src/har/har-exporter');
            const connector = panel.panelWin.connector || panel.connector;
            const { getSortedRequests } = panel.panelWin.windowRequire('devtools/client/netmonitor/src/selectors/index');
            const items = getSortedRequests(panel.panelWin.store.getState());
            const data = await HarExporter.fetchHarData({ connector, items, includeResponseBodies: false, forceExport: true });
            done(data || ('vazio: ' + items.length + ' itens'));
          })().catch((e) => done('erro: ' + e));
        """, str(HAR_DIR))
    finally:
        d.set_context('content')


ACCEPT_JS = """
  const re = /^(aceitar|aceito|concordo|concordar|entendi|ok|continuar|aceitar (todos|tudo)|accept( all)?|agree|got it)/i;
  const els = [...document.querySelectorAll('button, a, [role=button]')].filter(e => re.test((e.textContent || '').trim()));
  const visible = els.filter(e => e.offsetParent !== null);
  (visible[0] || els[0]) && (visible[0] || els[0]).click();
  return (visible[0] || els[0]) ? (visible[0] || els[0]).textContent.trim().slice(0, 40) : null;
"""


def main(url, folder=None, hide_webdriver=False, accept_consent=False):
    host = harness.hostnameOf(url) if hasattr(harness, 'hostnameOf') else url.split('/')[2]
    name = folder or host.replace('www.', '')
    out = ROOT / 'evidencias' / 'sites' / name
    out.mkdir(parents=True, exist_ok=True)
    d = start_with_devtools(hide_webdriver)
    try:
        d.get('about:blank')
        open_netmonitor(d)
        d.get(url)
        time.sleep(8)
        if accept_consent:
            clicked = d.execute_script(ACCEPT_JS)
            print('consentimento: clicado em', repr(clicked))
            time.sleep(6)
        # rola a página para disparar lazy-loading (aproxima o comportamento do Blacklight)
        for y in (600, 1400, 2400, 0):
            d.execute_script(f'window.scrollTo(0, {y})'); time.sleep(1.5)
        time.sleep(10)
        r, txt = harness.capture(d, None, out, 'relatorio', settle=1, title=url,
                                 report_tabs=('summary', 'trackers', 'cookies', 'storage', 'fingerprint', 'sync', 'hijack'), report_url=url)
        (out / 'pagina.txt').write_text(txt[:20000])
        # HAR: o auto-export grava ao final do carregamento (cobre só os primeiros segundos). Ao final da
        # visita força uma nova exportação com tudo o que o Network Monitor registrou (persistlog ativo).
        d.switch_to.window(d.window_handles[0]) if len(d.window_handles) > 1 else None
        data = export_har_via_console(d)
        if data and data.lstrip().startswith('{'):
            (out / f'{name}.har').write_text(data)
            har = json.loads(data)
            print(f'HAR (Network Monitor, visita completa): {len(har["log"]["entries"])} entradas -> {out / (name + ".har")}')
        else:
            print('HAR via fetchHarData falhou:', str(data)[:200])
            hars = sorted(HAR_DIR.glob('*.har'), key=lambda f: f.stat().st_mtime)
            if hars:
                shutil.copy(hars[-1], out / f'{name}.har')
                print('HAR (auto-export no load):', len(json.loads(hars[-1].read_text())['log']['entries']), 'entradas')
        if isinstance(r, dict):
            print('plugin:', r['score']['score'], r['score']['grade'], 'terceiros:', len(r['thirdParties']), 'rastreadores:', sum(1 for v in r['thirdParties'].values() if v['tracker']))
    finally:
        d.quit()


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    main(args[0], args[1] if len(args) > 1 else None, hide_webdriver='--hide-webdriver' in sys.argv, accept_consent='--accept-consent' in sys.argv)
