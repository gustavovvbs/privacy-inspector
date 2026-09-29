"""Harness de evidências: abre o Firefox com o plugin carregado (temporário), navega, tira prints
do relatório do plugin e exporta o JSON. Usado por capture_ddg.py e capture_site.py.

Uso rápido:  .venv/bin/python tools/harness.py smoke https://exemplo.com
"""
import json, os, sys, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
ADDON_ID = 'privacy-inspector@insper.edu.br'
UUID = '7b1f9c7e-2f1a-4a1e-9d3e-0b2c4d6e8f10'  # fixo para que moz-extension://UUID/ seja previsível
EXT_BASE = f'moz-extension://{UUID}/'
FIREFOX_BIN = '/Applications/Firefox.app/Contents/MacOS/firefox'


DOWNLOAD_DIR = ROOT / 'evidencias' / '_downloads'


def start(headless=False, width=1000, height=1000, profile_prefs=None):
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    opts = Options()
    opts.set_preference('browser.download.folderList', 2)
    opts.set_preference('browser.download.dir', str(DOWNLOAD_DIR))
    opts.set_preference('browser.download.useDownloadDir', True)
    opts.set_preference('browser.download.alwaysOpenPanel', False)
    opts.set_preference('browser.helperApps.neverAsk.saveToDisk', 'application/json,text/plain,application/octet-stream,text/json')
    opts.binary_location = FIREFOX_BIN
    if headless:
        opts.add_argument('-headless')
    opts.add_argument(f'--width={width}')
    opts.add_argument(f'--height={height}')
    opts.set_preference('extensions.webextensions.uuids', json.dumps({ADDON_ID: UUID}))
    opts.set_preference('devtools.netmonitor.persistlog', True)
    opts.set_preference('browser.cache.disk.enable', False)
    opts.set_preference('browser.cache.memory.enable', False)
    # Perfil "neutro": sem bloqueio nativo, para o plugin observar o tráfego completo.
    opts.set_preference('privacy.trackingprotection.enabled', False)
    opts.set_preference('privacy.trackingprotection.pbmode.enabled', False)
    opts.set_preference('network.cookie.cookieBehavior', 0)
    opts.set_preference('privacy.query_stripping.enabled', False)
    opts.set_preference('privacy.bounceTrackingProtection.mode', 0)
    opts.set_preference('privacy.resistFingerprinting', False)
    opts.set_preference('privacy.fingerprintingProtection', False)
    opts.set_preference('privacy.partition.network_state', False)
    for k, v in (profile_prefs or {}).items():
        opts.set_preference(k, v)
    driver = webdriver.Firefox(options=opts, service=Service(log_output=os.devnull, service_args=['--allow-system-access']))
    driver.install_addon(str(SRC), temporary=True)
    driver.set_window_size(width, height)
    time.sleep(1.0)
    return driver


def report_for(driver, page_url, wait=1.0):
    """Abre o relatório do plugin (em aba própria) para a aba cuja URL começa com page_url."""
    page_handle = driver.current_window_handle
    before = set(driver.window_handles)
    open_ext_tab(driver, EXT_BASE + 'popup/popup.html?url=' + page_url)
    new = [h for h in driver.window_handles if h not in before]
    driver.switch_to.window(new[0])
    time.sleep(wait)
    data = driver.execute_async_script("""
      const done = arguments[0];
      (async () => {
        const params = new URLSearchParams(location.search);
        const tabs = await browser.tabs.query({});
        const want = params.get('url');
        const hit = tabs.find(t => t.url === want) || tabs.find(t => t.url && t.url.startsWith(want));
        if (!hit) return done(null);
        const r = await browser.runtime.sendMessage({ type: 'getReport', tabId: hit.id });
        done(JSON.stringify(r));
      })().catch(e => done('ERR ' + e));
    """)
    return page_handle, (json.loads(data) if data and not data.startswith('ERR') else data)


def open_ext_tab(driver, url):
    """O Marionette não permite driver.get() em moz-extension://; abre a aba via contexto chrome."""
    driver.set_context('chrome')
    try:
        driver.execute_script("""
          const win = Services.wm.getMostRecentWindow('navigator:browser');
          win.gBrowser.selectedTab = win.gBrowser.addTab(arguments[0], {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
        """, url)
    finally:
        driver.set_context('content')
    time.sleep(0.8)


def shoot_full(driver, path):
    """Screenshot da página inteira, recortada à altura do conteúdo (máx. 5000px)."""
    driver.execute_script("document.querySelectorAll('details').forEach(d => d.open = true)")
    h = min(int(driver.execute_script('return Math.max(document.body.scrollHeight, document.body.offsetHeight)')) + 24, 5000)
    w = driver.get_window_size()['width']
    driver.set_window_size(w, max(h + 100, 400))
    time.sleep(0.5)
    dpr = driver.execute_script('return window.devicePixelRatio') or 1
    import io
    im = Image.open(io.BytesIO(driver.get_screenshot_as_png()))
    im = im.crop((0, 0, im.width, min(im.height, int(h * dpr))))
    im.save(str(path))


def grab_download(driver, out_path, selector='#download', wait=3.0):
    """Clica no botão de download da página (resultado gerado pela própria página) e move o arquivo."""
    before = set(DOWNLOAD_DIR.iterdir())
    try:
        driver.execute_script("const b = document.querySelector(arguments[0]); if (b) b.click();", selector)
    except Exception:
        return None
    for _ in range(int(wait * 10)):
        time.sleep(0.1)
        new = [f for f in DOWNLOAD_DIR.iterdir() if f not in before and not f.name.endswith('.part')]
        if new:
            time.sleep(0.3)
            new[0].replace(out_path)
            return out_path
    return None


def compose(page_png, report_pngs, out_png, title=''):
    """Monta: página de teste (esq.) + abas do relatório do plugin empilhadas (dir.)."""
    a = Image.open(page_png)
    bs = [Image.open(p) for p in report_pngs]
    bw = max(b.width for b in bs); bh = sum(b.height for b in bs) + 16 * (len(bs) - 1)
    h = max(a.height, bh)
    canvas = Image.new('RGB', (a.width + bw + 24, h + 40), 'white')
    canvas.paste(a, (0, 40))
    y = 40
    for b in bs:
        canvas.paste(b, (a.width + 24, y)); y += b.height + 16
    try:
        from PIL import ImageDraw
        ImageDraw.Draw(canvas).text((12, 12), title, fill='black')
    except Exception:
        pass
    canvas.save(out_png)


def set_settings(driver, blocklist=(), block_known=False):
    """Grava a lista de bloqueio do plugin (storage.local) por uma aba da extensão."""
    page_handle = driver.current_window_handle
    before = set(driver.window_handles)
    open_ext_tab(driver, EXT_BASE + 'popup/popup.html')
    new = [h for h in driver.window_handles if h not in before]
    driver.switch_to.window(new[0])
    driver.execute_async_script("""
      const done = arguments[2];
      browser.storage.local.set({ blocklist: arguments[0], blockKnownTrackers: arguments[1] }).then(() => done(true));
    """, list(blocklist), bool(block_known))
    time.sleep(0.5)
    driver.close(); driver.switch_to.window(page_handle)


def capture(driver, page_url, out_dir, name, actions=None, settle=6.0, title='', report_tabs=('summary',), report_url=None):
    """Visita page_url, executa `actions(driver)`, aguarda, e salva: <name>-pagina.png,
    <name>-plugin-<aba>.png, <name>.png (composição) e <name>.json (relatório do plugin).
    report_url: URL da aba a relatar quando as ações navegam (padrão: URL atual após as ações)."""
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    if page_url:
        driver.get(page_url)
        time.sleep(2.0)
    if actions:
        actions(driver)
    time.sleep(settle)
    page_text = driver.execute_script('return document.body.innerText')
    page_results = driver.execute_script('try { return JSON.stringify(window.results || null); } catch (e) { return null; }')
    shoot_full(driver, out_dir / f'{name}-pagina.png')
    grab_download(driver, out_dir / f'{name}-resultado-pagina.json')
    target = report_url or driver.current_url
    page_handle, report = report_for(driver, target)
    pngs = []
    for tab in report_tabs:
        driver.execute_script("document.querySelector('nav button[data-tab=\"%s\"]').click()" % tab)
        time.sleep(0.3)
        p = out_dir / f'{name}-plugin-{tab}.png'
        shoot_full(driver, p); pngs.append(p)
    driver.set_window_size(1000, 1000)
    (out_dir / f'{name}.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    (out_dir / f'{name}-pagina.txt').write_text(page_text + ('\n\n[window.results]\n' + page_results if page_results and page_results != 'null' else ''))
    compose(out_dir / f'{name}-pagina.png', pngs, out_dir / f'{name}.png', title or target)
    driver.close()
    driver.switch_to.window(page_handle)
    return report, page_text


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'smoke':
        d = start()
        try:
            r, txt = capture(d, sys.argv[2], ROOT / 'evidencias' / '_smoke', 'smoke', settle=8, report_tabs=('summary', 'trackers'))
            print(json.dumps({k: r[k] for k in ('hostname', 'requestsTotal', 'requestsThirdParty', 'frames', 'score')}, ensure_ascii=False, indent=1) if isinstance(r, dict) else r)
        finally:
            d.quit()
