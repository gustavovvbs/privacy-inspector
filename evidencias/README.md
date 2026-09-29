# Evidências

```
ddg/                 prints do plugin em execução em cada DuckDuckGo Privacy Test Page
                     (nome: <numero>-<pagina>.png, ex.: 05-tracker-blocking.png)
sites/<dominio>/     por site sorteado:
    <dominio>.har    exportado do DevTools do Firefox (Rede → ⚙ → Salvar tudo como HAR)
    plugin.png       popup do plugin na página
    plugin.json      relatório exportado pelo botão "Exportar JSON"
    blacklight.png   resultado em https://themarkup.org/blacklight
    ublock.png       painel do uBlock Origin na mesma página
```

Para o HAR ser comparável ao plugin, exporte-o na mesma visita em que tirou o print do popup.
