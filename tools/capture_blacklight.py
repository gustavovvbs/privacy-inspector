"""Roda o Blacklight (The Markup) para um site e salva print + texto do resultado.
Uso: .venv/bin/python tools/capture_blacklight.py https://www.exemplo.com.br [pasta]
Saída: evidencias/sites/<pasta>/blacklight.png, blacklight.txt
"""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import harness
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
import os


def main(url, folder=None):
    host = harness.hostnameOf(url)
    name = folder or host.replace('www.', '')
    out = harness.ROOT / 'evidencias' / 'sites' / name
    out.mkdir(parents=True, exist_ok=True)
    opts = Options(); opts.binary_location = harness.FIREFOX_BIN
    opts.add_argument('--width=1100'); opts.add_argument('--height=1000')
    d = webdriver.Firefox(options=opts, service=Service(log_output=os.devnull))
    try:
        d.get('https://themarkup.org/blacklight')
        time.sleep(3)
        # Preenche o formulário: URL, dispositivo desktop, localização EUA, com cache permitido.
        d.execute_script("""
          const host = arguments[0];
          document.querySelector('input[name=device][value=desktop]').click();
          document.querySelector('input[name=location][value="us-oh"]').click();
          const inp = document.querySelector('input[name=url]');
          inp.focus(); inp.value = host; inp.dispatchEvent(new Event('input', { bubbles: true }));
          [...document.querySelectorAll('button[type=submit]')].find(b => /scan site/i.test(b.textContent)).click();
        """, host)
        txt = ''
        for _ in range(72):  # até ~6 min
            time.sleep(5)
            txt = d.execute_script('return document.body.innerText')
            low = txt.lower()
            if ('blacklight inspection result' in low) or ('ad tracker' in low and 'third-party cookie' in low and 'canvas' in low) or 'something went wrong' in low or 'could not' in low[:6000]:
                break
        time.sleep(3)
        (out / 'blacklight.txt').write_text(txt)
        harness.shoot_full(d, out / 'blacklight.png')
        # Arquivo de resultados do Blacklight (zip com inspection.json: domínios, cookies, fingerprinting…)
        link = d.execute_script("const a = [...document.querySelectorAll('a')].find(a => /blacklight-inspection-.*\\.zip$/.test(a.href)); return a ? a.href : null")
        if link:
            import urllib.request, zipfile, io
            data = urllib.request.urlopen(link, timeout=60).read()
            (out / 'blacklight-archive.zip').write_bytes(data)
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                for n in z.namelist():
                    if n.endswith('inspection.json'):
                        (out / 'blacklight-inspection.json').write_bytes(z.read(n))
            print('  archive:', link)
        print(name, 'blacklight ok', len(txt), 'chars')
    finally:
        d.quit()


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
