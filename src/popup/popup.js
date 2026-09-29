// Popup do Privacy Inspector: renderiza o relatório da aba ativa.
let report = null;
let tabId = null;

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (t, cls = '') => `<span class="chip ${cls}">${esc(t)}</span>`;
const table = (headers, rows) => rows.length
  ? `<table><thead><tr>${headers.map((h) => `<th class="${h.startsWith('#') ? 'num' : ''}">${esc(h.replace(/^#/, ''))}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${headers[i].startsWith('#') ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  : '<div class="empty">nada observado</div>';
const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('pt-BR') : '—';
const CAT_PT = { advertising: 'anúncios', analytics: 'analytics', social: 'social', 'session-recording': 'gravação de sessão', fingerprinting: 'fingerprinting', identity: 'identidade', test: 'teste (DDG)' };
const catChip = (c) => c ? chip(CAT_PT[c] || c, c === 'session-recording' || c === 'fingerprinting' ? 'bad' : 'warn') : '';

// A página do relatório pode ser aberta em uma aba própria (?tabId=N ou ?url=<url da página>),
// útil para prints de evidência e para relatórios longos.
async function targetTab() {
  const params = new URLSearchParams(location.search);
  if (params.get('tabId')) {
    try { return await browser.tabs.get(Number(params.get('tabId'))); } catch (e) { /* aba fechada */ }
  }
  if (params.get('url')) {
    const tabs = await browser.tabs.query({});
    const want = params.get('url');
    const hit = tabs.find((t) => t.url === want) || tabs.find((t) => t.url && t.url.startsWith(want));
    if (hit) return hit;
  }
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const tab = await targetTab();
  tabId = tab.id;
  report = await browser.runtime.sendMessage({ type: 'getReport', tabId });
  render(tab);
  if (new URLSearchParams(location.search).has('tabId') || new URLSearchParams(location.search).has('url')) {
    document.body.classList.add('standalone');
    $('#footerHint').textContent = 'relatório da aba: ' + (tab.url || '').slice(0, 80);
  }
}

function openInTab() {
  if (tabId == null) return;
  browser.tabs.create({ url: browser.runtime.getURL('popup/popup.html') + '?tabId=' + tabId });
}

function render(tab) {
  if (!report) {
    $('#site').textContent = tab.url || '';
    $('#meta').textContent = 'Sem relatório para esta aba. Recarregue a página.';
    for (const id of ['summary', 'trackers', 'cookies', 'storage', 'fingerprint', 'sync', 'hijack']) $('#tab-' + id).innerHTML = '<div class="empty">recarregue a página para começar a observar</div>';
    return;
  }
  const r = report;
  $('#site').textContent = r.hostname || r.url;
  $('#meta').textContent = `${r.requestsTotal} requisições, ${r.requestsThirdParty} para terceiros · ${Math.round((Date.now() - r.startedAt) / 1000)}s observados` + (r.blockedTotal ? ` · ${r.blockedTotal} bloqueadas` : '');
  $('#grade').textContent = r.score.grade; $('#grade').className = 'grade ' + r.score.grade;
  $('#points').textContent = r.score.score + '/100';

  const tp = Object.values(r.thirdParties).sort((a, b) => (b.tracker ? 1 : 0) - (a.tracker ? 1 : 0) || b.requests - a.requests);
  const trackers = tp.filter((t) => t.tracker);
  const ck = r.cookies.summary || {};
  const st = r.storage;
  const stTotal = st.localStorage.writes + st.localStorage.reads + st.sessionStorage.writes + st.sessionStorage.reads + st.indexedDB.opens + st.cacheStorage.opens;

  const counts = { trackers: trackers.length, cookies: ck.total || 0, storage: stTotal, fingerprint: r.fingerprint.canvas.reads + r.fingerprint.webgl.calls + r.fingerprint.audio.calls,
    sync: r.cookieSync.events.length + r.navigation.bounces.length, hijack: r.hijack.websockets.length + r.hijack.polling.length + r.hijack.overridden.length };
  for (const b of document.querySelectorAll('nav button')) {
    const k = b.dataset.tab; const n = counts[k];
    b.innerHTML = b.textContent.replace(/\s*\d+$/, '') + (n ? `<span class="n">${n}</span>` : '');
  }

  // Resumo
  $('#tab-summary').innerHTML = `
    <div class="cards">
      <div class="card"><div class="v">${tp.length}</div><div class="l">domínios de 3ª parte</div></div>
      <div class="card"><div class="v">${trackers.length}</div><div class="l">rastreadores conhecidos</div></div>
      <div class="card"><div class="v">${ck.total ?? '—'}</div><div class="l">cookies (${ck.thirdParty ?? 0} de 3ª parte)</div></div>
      <div class="card"><div class="v">${ck.injectedHttp ?? 0}+${ck.injectedJs ?? 0}</div><div class="l">cookies injetados (HTTP + JS)</div></div>
      <div class="card"><div class="v">${stTotal}</div><div class="l">operações de storage HTML5</div></div>
      <div class="card"><div class="v level ${r.fingerprint.level}">${{ none: 'não', possible: 'possível', likely: 'provável' }[r.fingerprint.level]}</div><div class="l">fingerprinting</div></div>
    </div>
    <h3>Composição da pontuação</h3>
    ${table(['Critério', '#Dedução', '#Teto'], r.score.breakdown.filter((b) => b.penalty > 0).map((b) => [esc(b.label) + `<div class="bar"><div style="width:${Math.round(b.penalty / b.cap * 100)}%"></div></div>`, '-' + b.penalty, b.cap]))}
    <p class="hint">Nota = 100 − soma das deduções (cada critério tem teto). A ≥ 85, B ≥ 70, C ≥ 50, D ≥ 30, E &lt; 30. Ver docs/metodologia-pontuacao.md.</p>`;

  // Rastreadores
  $('#tab-trackers').innerHTML = `
    <h3>Domínios de terceira parte (${tp.length})</h3>
    ${table(['Domínio', 'Empresa / categoria', '#Req.', '#Bloq.', ''], tp.map((t) => [
      `<b>${esc(t.domain)}</b><div class="hint">${Object.keys(t.hosts).slice(0, 3).map(esc).join(', ')}${Object.keys(t.hosts).length > 3 ? '…' : ''}<br>${Object.entries(t.types).map(([k, v]) => `${esc(k)}:${v}`).join(' ')}</div>`,
      t.tracker ? `${esc(t.owner || '')}<br>${catChip(t.category)}` : chip('não listado'),
      t.requests, t.blocked || 0,
      `<button class="mini block-btn" data-domain="${esc(t.domain)}">bloquear</button>`]))}`;

  // Cookies
  const cookieRows = (ck.list || []).sort((a, b) => (b.thirdParty ? 1 : 0) - (a.thirdParty ? 1 : 0) || (a.session ? 1 : 0) - (b.session ? 1 : 0)).map((c) => [
    `<b>${esc(c.name)}</b><div class="hint">${esc(c.domain)}</div>`,
    c.thirdParty ? chip('3ª parte', 'bad') : chip('1ª parte', 'ok'),
    c.session ? chip('sessão') : chip(`persistente · ${c.lifetimeDays}d`, c.lifetimeDays > 365 ? 'warn' : ''),
    fmtDate(c.expires),
    [c.secure && 'Secure', c.httpOnly && 'HttpOnly', c.sameSite && c.sameSite !== 'no_restriction' && `SameSite=${c.sameSite}`].filter(Boolean).map((x) => chip(x)).join('')]);
  $('#tab-cookies').innerHTML = `
    <div class="cards">
      <div class="card"><div class="v">${ck.firstParty ?? 0} / ${ck.thirdParty ?? 0}</div><div class="l">1ª parte / 3ª parte</div></div>
      <div class="card"><div class="v">${ck.session ?? 0} / ${ck.persistent ?? 0}</div><div class="l">sessão / persistentes</div></div>
      <div class="card"><div class="v">${ck.longLived ?? 0}</div><div class="l">persistentes &gt; 1 ano</div></div>
    </div>
    <h3>Cookies injetados nesta visita</h3>
    <p class="hint">Via Set-Cookie (HTTP): ${ck.injectedHttp ?? 0} (${ck.injectedHttpThirdParty ?? 0} por terceiros). Via document.cookie (JS): ${ck.injectedJs ?? 0}.</p>
    <details><summary>Set-Cookie recebidos (${r.cookies.setHeaders.length})</summary>${table(['Cookie', 'Origem', 'Tipo', 'Persistência'], r.cookies.setHeaders.slice(0, 80).map((c) => [esc(c.name), esc(c.host), c.thirdParty ? chip('3ª parte', 'bad') : chip('1ª parte', 'ok'), c.persistent ? chip(`persistente · ${Math.round((c.expiresIn || 0) / 86400)}d`) : chip('sessão')]))}</details>
    <details><summary>document.cookie (${r.cookies.jsSet.length})</summary>${table(['Cookie', 'Script', 'Persistência'], r.cookies.jsSet.slice(0, 80).map((c) => [esc(c.name), esc(c.script || c.frame || 'inline'), c.persistent ? chip('persistente') : chip('sessão')]))}</details>
    <h3>Cookie jar atual (${ck.total ?? 0})</h3>
    ${table(['Nome', 'Parte', 'Duração', 'Expira', 'Atributos'], cookieRows)}`;

  // Storage
  const stRow = (name, b) => [`<b>${name}</b>`, b.writes ?? b.opens ?? 0, b.reads ?? '—', Object.keys(b.keys || b.databases || b.caches || {}).slice(0, 8).map((k) => chip(k)).join('') || '—',
    Object.keys(b.thirdPartyFrames).map((d) => chip(d, 'bad')).join('') || chip('só 1ª parte', 'ok')];
  $('#tab-storage').innerHTML = `
    ${table(['API', '#Escritas', '#Leituras', 'Chaves', 'Frames de 3ª parte'], [stRow('localStorage', st.localStorage), stRow('sessionStorage', st.sessionStorage), stRow('IndexedDB', st.indexedDB), stRow('Cache API', st.cacheStorage)])}
    <h3>Frames observados (${Object.keys(r.frames).length})</h3>
    ${table(['Frame', 'Parte'], Object.entries(r.frames).slice(0, 40).map(([u, f]) => [esc(u.slice(0, 120)), f.thirdParty ? chip('3ª parte', 'bad') : chip('1ª parte', 'ok')]))}
    <details><summary>Últimos eventos (${st.events.length})</summary>${table(['API', 'Op.', 'Chave', 'Frame', 'Script'], st.events.slice(-60).reverse().map((e) => [esc(e.api), esc(e.op), esc(e.key || ''), esc(e.frame), esc((e.script || '').replace(/^https?:\/\//, '').slice(0, 60))]))}</details>`;

  // Fingerprint
  const fp = r.fingerprint;
  const scripts = (o) => Object.entries(o).map(([k, v]) => `${chip(k.replace(/^https?:\/\//, '').slice(0, 70))}×${v}`).join(' ') || '—';
  $('#tab-fingerprint').innerHTML = `
    <p>Nível: <span class="level ${fp.level}">${{ none: 'nenhum indício', possible: 'possível', likely: 'provável' }[fp.level]}</span></p>
    ${table(['Técnica', '#Chamadas', 'Detalhe', 'Scripts'], [
      ['Canvas', fp.canvas.reads, `${fp.canvas.likely} leitura(s) após fillText com área ≥ 16×16 ${fp.canvas.likely ? chip('fingerprint', 'bad') : ''}`, scripts(fp.canvas.scripts)],
      ['WebGL', fp.webgl.calls, `${fp.webgl.unmasked} leitura(s) de vendor/renderer; ${Object.entries(fp.webgl.methods).map(([k, v]) => `${esc(k)}×${v}`).join(', ')}`, scripts(fp.webgl.scripts)],
      ['Áudio', fp.audio.calls, Object.entries(fp.audio.methods).map(([k, v]) => `${esc(k)}×${v}`).join(', ') || '—', scripts(fp.audio.scripts)],
      ['Fontes', fp.fonts.measureText, 'measureText', scripts(fp.fonts.scripts)],
      ['Enumeração', Object.values(fp.enumeration.props).reduce((a, b) => a + b, 0), Object.keys(fp.enumeration.props).map((p) => chip(p)).join(''), Object.entries(fp.enumeration.scripts).map(([s, props]) => `${chip(s.replace(/^https?:\/\//, '').slice(0, 70))}: ${Object.keys(props).length} props`).join('<br>') || '—'],
    ])}
    <details><summary>Leituras de canvas (${fp.canvas.samples.length})</summary>${table(['Método', 'Canvas', 'Texto', 'No DOM', 'Script', ''], fp.canvas.samples.map((s) => [esc(s.method), `${s.width}×${s.height}`, s.textDrawn, s.attached ? 'sim' : 'não', esc((s.script || s.from || '').replace(/^https?:\/\//, '').slice(0, 60)), s.likely ? chip('fingerprint', 'bad') : chip('leitura')]))}</details>`;

  // Bounce / Sync
  const nav = r.navigation;
  $('#tab-sync').innerHTML = `
    <h3>Bounce tracking</h3>
    <p class="hint">Página anterior: ${esc(nav.referrerPage || '—')} · permanência: ${nav.dwellMs != null ? Math.round(nav.dwellMs / 1000) + 's' : '—'}</p>
    ${table(['Domínio intermediário', 'Mecanismo', 'De → Para', 'Parâmetros'], nav.bounces.map((b) => [`<b>${esc(b.domain)}</b><div class="hint">${esc(b.url.slice(0, 100))}</div>`, b.kind === 'http-redirect' ? chip(`HTTP ${b.status}`, 'bad') : chip(`client-side · ${Math.round(b.dwellMs / 1000)}s`, 'bad'), `${esc(b.from || '?')} → ${esc(b.to)}`, (b.trackingParams || []).map((p) => chip(p, 'warn')).join('') || '—']))}
    <details><summary>Cadeia de redirecionamentos desta navegação (${nav.redirectChain.length})</summary>${table(['Status', 'De', 'Para'], nav.redirectChain.map((h) => [h.status, esc(h.from.slice(0, 90)), esc(h.to.slice(0, 90))]))}</details>
    <h3>Cookie sync</h3>
    ${table(['Tipo', 'Parâmetro', 'Destino', 'Detalhe'], r.cookieSync.events.map((e) => [
      chip({ 'cookie-leak': 'vazamento de cookie', 'shared-id': 'ID compartilhado', 'sync-param': 'parâmetro de sync' }[e.kind], e.kind === 'sync-param' ? 'warn' : 'bad'),
      `<code>${esc(e.param)}</code><div class="hint">${esc(String(e.value).slice(0, 40))}</div>`, esc(e.toDomain),
      e.kind === 'cookie-leak' ? `cookie <code>${esc(e.cookieName)}</code>` : e.kind === 'shared-id' ? (e.domains || []).map((d) => chip(d)).join('') : esc(e.url.slice(0, 80))]))}
    <details><summary>Redirecionamentos entre terceiros em sub-recursos (${r.cookieSync.redirects.length})</summary>${table(['Status', 'De', 'Para', 'Params'], r.cookieSync.redirects.map((h) => [h.status, esc(h.fromDomain), esc(h.toDomain), (h.syncParams || []).map((p) => chip(p, 'warn')).join('')]))}</details>
    <h3>Parâmetros de rastreamento</h3>
    <p>Na URL da página: ${nav && r.queryParams.onPageUrl.length ? r.queryParams.onPageUrl.map((p) => chip(p, 'warn')).join('') : '—'}<br>Em requisições a terceiros: ${Object.entries(r.queryParams.onRequests).map(([k, v]) => chip(`${k}×${v}`, 'warn')).join('') || '—'}</p>`;

  // Hijack
  const h = r.hijack;
  const keylog = h.inputListeners.filter((l) => l.thirdParty);
  $('#tab-hijack').innerHTML = `
    <p>Nível: <span class="level ${h.level}">${{ none: 'nenhum indício', low: 'baixo', medium: 'médio', high: 'alto' }[h.level]}</span></p>
    <h3>Canais persistentes</h3>
    ${table(['Tipo', 'Destino', 'Parte', 'Script'], [...h.websockets.map((w) => ['WebSocket', esc(w.url.slice(0, 90)), w.thirdParty ? chip('3ª parte', 'bad') : chip('1ª parte', 'ok'), esc((w.script || w.via || '').replace(/^https?:\/\//, '').slice(0, 50))]),
      ...h.eventsources.map((w) => ['EventSource', esc(w.url.slice(0, 90)), w.thirdParty ? chip('3ª parte', 'bad') : chip('1ª parte', 'ok'), esc((w.script || '').slice(0, 50))])])}
    <h3>Polling persistente para terceiros</h3>
    ${table(['Endpoint', '#Chamadas', '#Intervalo', 'Regularidade'], h.polling.map((p) => [`${esc(p.url.slice(0, 90))} ${p.tracker ? chip('rastreador', 'bad') : ''}`, p.count, Math.round(p.avgIntervalMs / 1000) + 's', Math.round(p.regularity * 100) + '%']))}
    <h3>Funções nativas sobrescritas ${h.integrityPhase ? `<span class="hint">(verificado em ${esc(h.integrityPhase)})</span>` : ''}</h3>
    ${table(['Alvo', 'Código'], h.overridden.map((o) => [`<code>${esc(o.target)}</code>`, `<span class="hint">${esc(o.source)}</span>`]))}
    <h3>Novos objetos globais (${h.newGlobalsCount})</h3>
    <p>${h.newGlobals.slice(0, 60).map((g) => chip(g)).join('')}${h.newGlobalsCount > 60 ? ' …' : ''}</p>
    <h3>Listeners de teclado/entrada por scripts de 3ª parte (${keylog.length})</h3>
    ${table(['Evento', 'Alvo', 'Script'], keylog.slice(0, 40).map((l) => [esc(l.event), l.target === 'document' ? chip('document/window', 'bad') : chip('elemento'), esc((l.script || '').replace(/^https?:\/\//, '').slice(0, 70))]))}
    <details><summary>Listeners de movimento (mousemove/scroll) por script</summary>${table(['Script', '#Listeners'], Object.entries(h.motionListeners).map(([s, n]) => [esc(s.replace(/^https?:\/\//, '').slice(0, 90)), n]))}</details>`;

  for (const b of document.querySelectorAll('.block-btn')) b.addEventListener('click', () => addToBlocklist(b.dataset.domain));
}

// Lista de bloqueio
async function loadSettings() {
  const s = await browser.runtime.sendMessage({ type: 'getSettings' });
  $('#blocklist').value = (s.blocklist || []).join('\n');
  $('#blockKnown').checked = !!s.blockKnownTrackers;
}
async function saveSettings() {
  await browser.runtime.sendMessage({ type: 'saveSettings', blocklist: $('#blocklist').value.split('\n'), blockKnownTrackers: $('#blockKnown').checked });
  $('#saveStatus').textContent = 'salvo — recarregue a página';
  setTimeout(() => { $('#saveStatus').textContent = ''; }, 2500);
}
async function addToBlocklist(domain) {
  const cur = $('#blocklist').value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!cur.includes(domain)) cur.push(domain);
  $('#blocklist').value = cur.join('\n');
  await saveSettings();
  document.querySelector('nav button[data-tab="blocklist"]').click();
}

function exportJson() {
  if (!report) return;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `privacy-inspector_${(report.hostname || 'page').replace(/[^\w.-]/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
}

document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
}));
$('#refresh').addEventListener('click', load);
$('#export').addEventListener('click', exportJson);
$('#openTab').addEventListener('click', openInTab);
$('#saveBlocklist').addEventListener('click', saveSettings);

load();
loadSettings();
