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


def start_with_devtools():
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
    """Fallback: dispara a exportação do HAR pelo comando HAR.triggerExport do Network Monitor."""
    d.set_context('chrome')
    try:
        d.execute_async_script("""
          const done = arguments[0];
          (async () => {
            const { require } = ChromeUtils.importESModule('resource://devtools/shared/loader/Loader.sys.mjs');
            const { gDevTools } = require('devtools/client/framework/devtools');
            const win = Services.wm.getMostRecentWindow('navigator:browser');
            const toolbox = gDevTools.getToolboxForTab(win.gBrowser.selectedTab);
            const panel = toolbox && toolbox.getPanel('netmonitor');
            if (!panel) return done('sem painel');
            const { HarExporter } = panel.panelWin.windowRequire('devtools/client/netmonitor/src/har/har-exporter');
            const connector = panel.panelWin.connector || panel.connector;
            await HarExporter.save({ connector, includeResponseBodies: false, defaultLogDir: arguments[1], forceExport: true, fileName: 'export.har' });
            done('ok');
          })().catch((e) => done('erro: ' + e));
        """, str(HAR_DIR))
    finally:
        d.set_context('content')


def main(url, folder=None):
    host = harness.hostnameOf(url) if hasattr(harness, 'hostnameOf') else url.split('/')[2]
    name = folder or host.replace('www.', '')
    out = ROOT / 'evidencias' / 'sites' / name
    out.mkdir(parents=True, exist_ok=True)
    d = start_with_devtools()
    try:
        d.get('about:blank')
        open_netmonitor(d)
        d.get(url)
        time.sleep(8)
        # rola a página para disparar lazy-loading (aproxima o comportamento do Blacklight)
        for y in (600, 1400, 2400, 0):
            d.execute_script(f'window.scrollTo(0, {y})'); time.sleep(1.5)
        time.sleep(10)
        r, txt = harness.capture(d, None, out, 'relatorio', settle=1, title=url,
                                 report_tabs=('summary', 'trackers', 'cookies', 'storage', 'fingerprint', 'sync', 'hijack'), report_url=url)
        (out / 'pagina.txt').write_text(txt[:20000])
        # HAR: auto-export escreve em HAR_DIR ao final do carregamento; se não escreveu, força.
        hars = sorted(HAR_DIR.glob('*.har'), key=lambda f: f.stat().st_mtime)
        if not hars:
            export_har_via_console(d); time.sleep(4)
            hars = sorted(HAR_DIR.glob('*.har'), key=lambda f: f.stat().st_mtime)
        if hars:
            shutil.copy(hars[-1], out / f'{name}.har')
            har = json.loads((out / f'{name}.har').read_text())
            n = len(har['log']['entries'])
            print(f'HAR: {n} entradas -> {out / (name + ".har")}')
        else:
            print('HAR: não exportado (exporte manualmente pelo DevTools)')
        if isinstance(r, dict):
            print('plugin:', r['score']['score'], r['score']['grade'], 'terceiros:', len(r['thirdParties']), 'rastreadores:', sum(1 for v in r['thirdParties'].values() if v['tracker']))
    finally:
        d.quit()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
