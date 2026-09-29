"""Gera o relatório em PDF a partir dos markdowns de docs/ usando o Chrome headless.
Uso: .venv/bin/python tools/build_pdf.py
"""
import re, subprocess, sys
from pathlib import Path
import markdown

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PARTS = ['relatorio-capa.md', 'relatorio-ddg.md', 'relatorio-sites.md', 'metodologia-pontuacao.md', 'relatorio-pontuacao.md']

CSS = """
body { font: 10.5pt/1.4 -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 0; }
h1 { font-size: 18pt; page-break-before: always; border-bottom: 2px solid #2b5bd7; padding-bottom: 4px; }
h1:first-of-type { page-break-before: auto; }
h2 { font-size: 13pt; margin-top: 18px; } h3 { font-size: 11pt; }
table { border-collapse: collapse; width: 100%; font-size: 8.5pt; margin: 8px 0; page-break-inside: auto; }
th, td { border: 1px solid #bbb; padding: 4px 5px; vertical-align: top; text-align: left; }
th { background: #eef1f6; } tr { page-break-inside: avoid; }
code { font-family: Menlo, monospace; font-size: 8pt; background: #f2f3f5; padding: 0 2px; }
pre { background: #f2f3f5; padding: 8px; font-size: 8pt; white-space: pre-wrap; }
img { max-width: 100%; border: 1px solid #ddd; page-break-inside: avoid; }
figure { margin: 10px 0; page-break-inside: avoid; } figcaption { font-size: 8.5pt; color: #555; }
@page { size: A4; margin: 14mm 12mm; }
"""


def build():
    html = ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>' + CSS + '</style></head><body>']
    for part in PARTS:
        p = ROOT / 'docs' / part
        if not p.exists():
            continue
        md = p.read_text()
        # Referências a prints "`evidencias/...png`" viram figuras embutidas.
        def fig(m):
            rel = m.group(1)
            f = ROOT / rel
            return f'<figure><img src="file://{f}"><figcaption>{rel}</figcaption></figure>' if f.exists() else m.group(0)
        md = re.sub(r'`(evidencias/[^`]+\.png)`', lambda m: m.group(0), md)  # dentro de tabelas mantém o nome
        body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
        # Depois da tabela do DDG, anexa as figuras de cada linha na ordem.
        pngs = re.findall(r'`(evidencias/[^`]+\.png)`', md)
        seen = []
        for rel in pngs:
            if rel in seen: continue
            seen.append(rel)
            body += fig(re.match(r'(.*)', rel))
        html.append(body)
    html.append('</body></html>')
    out_html = ROOT / 'docs' / 'relatorio.html'
    out_html.write_text('\n'.join(html))
    out_pdf = ROOT / 'docs' / 'relatorio.pdf'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', f'--print-to-pdf={out_pdf}', str(out_html)], check=True, capture_output=True)
    print('PDF:', out_pdf, out_pdf.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    build()
