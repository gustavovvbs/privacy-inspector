"""Gera o relatório em PDF a partir dos markdowns de docs/ usando o Chrome headless.
Uso: .venv/bin/python tools/build_pdf.py
"""
import re, subprocess, sys
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PARTS = ['relatorio-capa.md', 'relatorio-ddg.md', 'relatorio-sites.md', 'metodologia-pontuacao.md', 'relatorio-pontuacao.md', 'relatorio-apendice-reconciliacao.md']
SITE_FIGS = ['relatorio-pagina.png', 'relatorio-plugin-summary.png', 'relatorio-plugin-trackers.png', 'relatorio-plugin-cookies.png', 'relatorio-plugin-storage.png', 'relatorio-plugin-fingerprint.png', 'relatorio-plugin-sync.png', 'relatorio-plugin-hijack.png', 'ublock.png', 'ublock-popup.png', 'blacklight.png']

CSS = """
body { font: 10.5pt/1.4 -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 0; }
h1 { font-size: 18pt; page-break-before: always; border-bottom: 2px solid #2b5bd7; padding-bottom: 4px; }
h1:first-of-type { page-break-before: auto; }
h2 { font-size: 13pt; margin-top: 18px; } h3 { font-size: 11pt; }
h3.print, h2.print { break-before: page; page-break-before: always; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 8pt; margin: 8px 0; page-break-inside: auto; }
table.appendix th, table.appendix td { font-size: 6.8pt; padding: 2px 3px; }
th, td { border: 1px solid #bbb; padding: 4px 5px; vertical-align: top; text-align: left; overflow-wrap: anywhere; word-break: break-word; }
table:not(.appendix) th:first-child, table:not(.appendix) td:first-child { width: 22px; }
table.appendix th:first-child, table.appendix td:first-child { width: 120px; }
th { background: #eef1f6; } tr { page-break-inside: avoid; }
code { font-family: Menlo, monospace; font-size: 7.5pt; background: #f2f3f5; padding: 0 2px; white-space: pre-wrap; overflow-wrap: anywhere; }
pre { background: #f2f3f5; padding: 8px; font-size: 8pt; white-space: pre-wrap; }
img { max-width: 100%; max-height: 118mm; width: auto; height: auto; border: 1px solid #ddd; display: block; margin: 0 auto; }
figure { display: inline-block; width: 49%; margin: 4px 0; vertical-align: top; page-break-inside: avoid; break-inside: avoid; } figcaption { font-size: 7.5pt; color: #555; text-align: center; word-break: break-all; }
@page { size: A4 landscape; margin: 12mm 10mm; }
"""


def resolve_png(rel):
    cands = [ROOT / rel, ROOT / 'evidencias' / 'ddg' / rel, *ROOT.glob(f'evidencias/sites/*/{rel}')]
    return next((c for c in cands if c.exists()), None)


def figure(f):
    return f'<figure><img src="file://{f}"><figcaption>{f.relative_to(ROOT)}</figcaption></figure>'


def expand_composite(f):
    """Para um print composto NN-nome.png, usa as partes: NN-nome-pagina.png e NN-nome-plugin-<aba>.png,
    cada uma cabendo em uma página; se não houver partes, usa o próprio arquivo."""
    stem = f.with_suffix('').name
    parts = [f.parent / f'{stem}-pagina.png'] + sorted(f.parent.glob(f'{stem}-plugin-*.png'))
    parts = [p for p in parts if p.exists()]
    return parts or [f]


def build():
    html = ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>']
    for part in PARTS:
        p = ROOT / 'docs' / part
        if not p.exists():
            continue
        md = p.read_text()
        body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
        if part.startswith('relatorio-apendice'):
            body = body.replace('<table>', '<table class="appendix">')
        # Cada print citado entre crases (`nome.png` ou `evidencias/.../nome.png`) é anexado como figura
        # após o texto da seção, na ordem em que aparece.
        seen = []
        for rel in re.findall(r'`([^`]+\.png)`', md):
            if rel in seen or '*' in rel:
                continue
            seen.append(rel)
            f = resolve_png(rel)
            if f:
                body += f'<h3 class="print">Print — {rel}</h3>' + ''.join(figure(p) for p in expand_composite(f))
            else:
                print('aviso: print não encontrado:', rel, file=sys.stderr)
        if part == 'relatorio-sites.md':
            for site in ('uol.com.br', 'terra.com.br', 'mercadolivre.com.br'):
                body += f'<h2 class="print">Prints — {site}</h2>'
                for fig in SITE_FIGS:
                    f = ROOT / 'evidencias' / 'sites' / site / fig
                    if f.exists():
                        body += figure(f)
        html.append(body)
    html.append('</body></html>')
    out_html = ROOT / 'docs' / 'relatorio.html'
    out_html.write_text('\n'.join(html))
    out_pdf = ROOT / 'docs' / 'relatorio.pdf'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out_pdf}', str(out_html)], check=True, capture_output=True)
    print('PDF:', out_pdf, out_pdf.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    build()
