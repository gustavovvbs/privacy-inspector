// Privacy Inspector — background script.
// Mantém um relatório por aba, alimentado pelos eventos webRequest, cookies e pelo content script.

const reports = new Map(); // tabId -> report

function newReport(url) {
  return {
    url,
    hostname: hostnameOf(url),
    baseDomain: baseDomain(hostnameOf(url)),
    startedAt: Date.now(),
    thirdParties: {},   // domínio -> { requests, types, tracker, category, blocked }
    requestsTotal: 0,
    requestsThirdParty: 0,
    storage: {
      localStorage: { reads: 0, writes: 0, keys: {}, thirdPartyFrames: {} },
      sessionStorage: { reads: 0, writes: 0, keys: {}, thirdPartyFrames: {} },
      indexedDB: { opens: 0, databases: {}, thirdPartyFrames: {} },
      cacheStorage: { opens: 0, caches: {}, thirdPartyFrames: {} },
      events: [],
    },
    frames: {},         // frameUrl -> { thirdParty }
    navigation: {
      referrerPage: null,   // página anterior nesta aba
      redirectChain: [],    // hops HTTP (3xx) até esta página
      bounces: [],          // domínios intermediários suspeitos de bounce tracking
      dwellMs: null,
    },
    cookieSync: {
      events: [],           // { kind, param, value, fromDomain, toDomain, cookieName }
      identifiers: {},      // valor -> conjunto de domínios que o receberam
      redirects: [],        // 3xx entre terceiros em sub-recursos (pixel chains)
    },
    queryParams: {
      onPageUrl: [],        // parâmetros de rastreamento na URL da própria página
      onRequests: {},       // param -> contagem em requisições de terceiros
    },
    hijack: {
      websockets: [],       // { url, domain, thirdParty, script, via }
      eventsources: [],
      polling: [],          // { url, domain, count, avgIntervalMs, regularity }
      inputListeners: [],   // { event, target, script, thirdParty }
      motionListeners: {},  // script -> count
      overridden: [],       // funções nativas sobrescritas por scripts
      newGlobals: [],
      newGlobalsCount: 0,
      level: 'none',
    },
    openedTabs: [],         // abas/popups abertos por esta página (window.open) — têm relatório próprio
    _timeline: {},          // urlSemQuery -> [timestamps] (uso interno para polling)
    _cookieValues: {},      // valor de cookie -> nome (uso interno para cookie sync)
    fingerprint: {
      canvas: { reads: 0, likely: 0, scripts: {}, samples: [] },
      webgl: { calls: 0, unmasked: 0, scripts: {}, methods: {} },
      audio: { calls: 0, scripts: {}, methods: {} },
      fonts: { measureText: 0, scripts: {} },
      enumeration: { props: {}, scripts: {} },
      level: 'none', // none | possible | likely
    },
    cookies: {
      setHeaders: [],      // cookies injetados via Set-Cookie (HTTP)
      jsSet: [],           // cookies injetados via document.cookie (JS)
      summary: null,       // preenchido no snapshot (cookies.getAll)
    },
  };
}

function getReport(tabId, url) {
  let r = reports.get(tabId);
  if (!r || (url && baseDomain(hostnameOf(url)) !== r.baseDomain)) {
    r = newReport(url || (r && r.url) || '');
    reports.set(tabId, r);
  }
  return r;
}

// ---------------------------------------------------------------------------
// Navegação: cadeias de redirecionamento e bounce tracking
// ---------------------------------------------------------------------------
const pendingChains = new Map(); // tabId -> [{ from, to, status }] durante a navegação de topo
const lastPage = new Map();      // tabId -> { url, committedAt, referrerPage }

// Parâmetros de query usados para rastreamento entre sites (alvo da página "Query parameters" do DDG).
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid', 'twclid', 'igshid',
  'mc_eid', 'mc_cid', 'yclid', 'li_fat_id', 'vero_id', '_hsenc', '_hsmi', 'hsCtaTracking', 'oly_anon_id', 'oly_enc_id',
  '_openstat', 'wickedid', 's_cid', 'ncid', 'ref_src', 'ref_url', 'rb_clickid', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'sc_cid', 'ss_email_id', 'guce_referrer', '_ga', '_gl']);
// Nomes de parâmetros tipicamente usados em cookie sync entre plataformas de anúncios.
const SYNC_PARAM_NAMES = /^(uid|user_id|userid|puid|partner_uid|partner_id|external_id|ext_id|google_gid|google_cver|ttd_puid|ttd_id|id5id|idfa|gaid|aaid|ifa|buyeruid|bidder_uid|cid|cuid|dsp_id|ssp_id|sync_id|sid|uuid|ruid|rlid|rtb_id|_fbp|fbp|fbc|em|ph|hem)$/i;

function trackingParamsOf(url) {
  try { return [...new URL(url).searchParams.keys()].filter((k) => TRACKING_PARAMS.has(k)); } catch (e) { return []; }
}

browser.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return;
  pendingChains.set(d.tabId, []);
});

browser.webRequest.onBeforeRedirect.addListener((d) => {
  if (d.tabId < 0) return;
  const hop = { from: d.url, to: d.redirectUrl, status: d.statusCode, at: Date.now(),
    fromDomain: baseDomain(hostnameOf(d.url)), toDomain: baseDomain(hostnameOf(d.redirectUrl)) };
  if (d.type === 'main_frame') {
    const chain = pendingChains.get(d.tabId) || [];
    chain.push(hop); pendingChains.set(d.tabId, chain);
    return;
  }
  // Redirecionamentos entre terceiros em sub-recursos (pixel → pixel) são o mecanismo clássico de cookie sync.
  const r = reportForRequest(d);
  if (!r) return;
  if (hop.fromDomain !== hop.toDomain && isThirdParty(d.url, r.url) && isThirdParty(d.redirectUrl, r.url)) {
    hop.syncParams = [...new URL(d.redirectUrl).searchParams.keys()].filter((k) => SYNC_PARAM_NAMES.test(k));
    if (r.cookieSync.redirects.length < 100) r.cookieSync.redirects.push(hop);
  }
}, { urls: ['<all_urls>'] });

// Reinicia o relatório a cada navegação de topo (nova página) e avalia bounce tracking.
browser.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const now = Date.now();
  const prev = lastPage.get(details.tabId) || null;
  const prevReport = reports.get(details.tabId) || null;
  const r = newReport(details.url);
  reports.set(details.tabId, r);
  r.navigation.redirectChain = pendingChains.get(details.tabId) || [];
  pendingChains.delete(details.tabId);
  r.navigation.referrerPage = prev ? prev.url : null;
  r.navigation.dwellMs = prev ? now - prev.committedAt : null;
  r.queryParams.onPageUrl = trackingParamsOf(details.url);

  const dest = r.baseDomain;
  const origin = prev ? baseDomain(hostnameOf(prev.url)) : null;
  // (a) bounce por HTTP: hop intermediário em domínio ≠ origem e ≠ destino.
  const chainDomains = r.navigation.redirectChain.map((h) => h.fromDomain);
  const landingParams = (() => { try { return [...new URL(details.url).searchParams].map(([k, v]) => `${k}=${v}`); } catch (e) { return []; } })();
  for (const h of r.navigation.redirectChain) {
    if (h.fromDomain && h.fromDomain !== dest && h.fromDomain !== origin) {
      r.navigation.bounces.push({ domain: hostnameOf(h.from), kind: 'http-redirect', status: h.status, url: h.from,
        trackingParams: trackingParamsOf(h.from), landingParams, from: origin, to: dest });
    }
  }
  // (b) bounce por JS/meta refresh: página anterior em domínio ≠ origem dela e ≠ destino, com permanência curta.
  if (prev && prev.referrerPage && r.navigation.dwellMs != null && r.navigation.dwellMs < 4000) {
    const mid = baseDomain(hostnameOf(prev.url));
    const src = baseDomain(hostnameOf(prev.referrerPage));
    if (mid && mid !== dest && mid !== src && !chainDomains.includes(mid)) {
      // Evidência do que a página de passagem fez (cookies via JS, storage) antes de redirecionar.
      const evidence = prevReport ? {
        cookiesJs: prevReport.cookies.jsSet.map((c) => c.raw),
        cookiesHttp: prevReport.cookies.setHeaders.map((c) => c.name),
        storageKeys: [...Object.keys(prevReport.storage.localStorage.keys), ...Object.keys(prevReport.storage.sessionStorage.keys)],
        requests: prevReport.requestsTotal,
      } : null;
      r.navigation.bounces.push({ domain: hostnameOf(prev.url), kind: 'client-side', dwellMs: r.navigation.dwellMs, url: prev.url,
        trackingParams: trackingParamsOf(prev.url), landingParams, from: src, to: dest, evidence });
    }
  }
  lastPage.set(details.tabId, { url: details.url, committedAt: now, referrerPage: prev ? prev.url : null });

  // Valores de cookies de 1ª parte já existentes, para detectar vazamento em requisições a terceiros.
  try {
    for (const c of await browser.cookies.getAll({ url: details.url })) {
      if (c.value && c.value.length >= 8) r._cookieValues[c.value] = c.name;
    }
  } catch (e) { /* esquemas sem cookies */ }
});

browser.tabs.onRemoved.addListener((tabId) => reports.delete(tabId));

browser.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId == null) return;
  const r = reports.get(tab.openerTabId);
  if (r) r.openedTabs.push({ tabId: tab.id, url: tab.url || '', at: Date.now() });
});
browser.tabs.onUpdated.addListener((tabId, info) => {
  if (!info.url) return;
  for (const r of reports.values()) for (const t of r.openedTabs) if (t.tabId === tabId && !t.url.startsWith('http')) t.url = info.url;
});

// Requisições sem aba (tabId = -1: WebSocket, service worker, prefetch) são atribuídas à aba mais
// recente cuja página tem o mesmo eTLD+1 da originUrl/documentUrl.
function reportForRequest(details) {
  if (details.tabId >= 0) return reports.get(details.tabId);
  const origin = details.documentUrl || details.originUrl;
  if (!origin) return null;
  const dom = baseDomain(hostnameOf(origin));
  let best = null;
  for (const r of reports.values()) if (r.baseDomain === dom && (!best || r.startedAt > best.startedAt)) best = r;
  return best;
}

function recordRequest(details) {
  const r = reportForRequest(details);
  if (!r) return;
  r.requestsTotal++;
  const host = hostnameOf(details.url);
  if (!host || !isThirdParty(details.url, r.url)) return;
  r.requestsThirdParty++;
  const tracker = classifyTracker(host);
  // Agrupa por eTLD+1, exceto quando a lista identifica um subdomínio específico (ex.: bad.third-party.site).
  const dom = tracker && tracker.domain.length > baseDomain(host).length ? tracker.domain : baseDomain(host);
  const entry = r.thirdParties[dom] || (r.thirdParties[dom] = {
    domain: dom, hosts: {}, requests: 0, types: {}, tracker: null, category: null, blocked: 0,
  });
  entry.requests++;
  entry.hosts[host] = (entry.hosts[host] || 0) + 1;
  entry.types[details.type] = (entry.types[details.type] || 0) + 1;
  if (!entry.tracker && tracker) { entry.tracker = tracker.domain; entry.category = tracker.category; entry.owner = tracker.owner; }
  inspectQueryForSync(r, details.url, dom);
  if (details.type === 'websocket') {
    r.hijack.websockets.push({ url: details.url.slice(0, 200), domain: dom, thirdParty: true, via: 'webRequest', at: Date.now() });
    updateHijackLevel(r);
  } else if (details.type === 'xmlhttprequest' || details.type === 'beacon' || details.type === 'image' || details.type === 'ping') {
    trackPolling(r, details.url, dom);
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Lista de bloqueio personalizada (storage.local)
// ---------------------------------------------------------------------------
const settings = { blocklist: [], blockKnownTrackers: false };
async function loadSettings() {
  const st = await browser.storage.local.get(['blocklist', 'blockKnownTrackers']);
  settings.blocklist = Array.isArray(st.blocklist) ? st.blocklist : [];
  settings.blockKnownTrackers = !!st.blockKnownTrackers;
}
loadSettings();
browser.storage.onChanged.addListener(loadSettings);

function isBlocklisted(host) {
  const parts = host.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    if (settings.blocklist.includes(parts.slice(i).join('.'))) return true;
  }
  return false;
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const entry = recordRequest(details);
    if (!entry || details.type === 'main_frame') return;
    const host = hostnameOf(details.url);
    const blockIt = isBlocklisted(host) || (settings.blockKnownTrackers && entry.tracker);
    if (blockIt) {
      entry.blocked++;
      const r = reportForRequest(details);
      if (r) r.blockedTotal = (r.blockedTotal || 0) + 1;
      return { cancel: true };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// ---------------------------------------------------------------------------
// Hijacking: polling persistente para terceiros
// ---------------------------------------------------------------------------
// Agrupa requisições ao mesmo endpoint (URL sem query) e considera polling quando há
// >= 5 chamadas com intervalos regulares (coeficiente de variação < 0.5) ou >= 12 chamadas em 2 min.
function trackPolling(r, url, dom) {
  const key = url.split('?')[0].split('#')[0];
  const t = r._timeline[key] || (r._timeline[key] = []);
  t.push(Date.now());
  if (t.length > 50) t.shift();
  if (t.length < 5) return;
  const intervals = [];
  for (let i = 1; i < t.length; i++) intervals.push(t[i] - t[i - 1]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - avg) ** 2, 0) / intervals.length);
  const cv = avg ? sd / avg : 1;
  const span = t[t.length - 1] - t[0];
  const regular = cv < 0.5 && avg >= 500;
  const heavy = t.length >= 12 && span <= 120000;
  if (!regular && !heavy) return;
  let entry = r.hijack.polling.find((p) => p.url === key);
  if (!entry) { entry = { url: key, domain: dom, count: 0, avgIntervalMs: 0, regularity: 0 }; r.hijack.polling.push(entry); }
  entry.count = t.length; entry.avgIntervalMs = Math.round(avg); entry.regularity = +(1 - Math.min(cv, 1)).toFixed(2);
  entry.tracker = classifyTracker(hostnameOf(url)) ? true : false;
  updateHijackLevel(r);
}

function updateHijackLevel(r) {
  const h = r.hijack;
  const thirdPartyKeyloggers = h.inputListeners.filter((l) => l.thirdParty && l.target === 'document').length;
  if (h.overridden.length > 0 || thirdPartyKeyloggers > 0 || (h.websockets.some((w) => w.thirdParty) && h.polling.length > 0)) h.level = 'high';
  else if (h.websockets.some((w) => w.thirdParty) || h.polling.length > 0 || h.inputListeners.some((l) => l.thirdParty)) h.level = 'medium';
  else if (h.newGlobalsCount > 40 || h.eventsources.length) h.level = 'low';
  else h.level = 'none';
}

// ---------------------------------------------------------------------------
// Cookie sync: identificadores em query strings de requisições a terceiros
// ---------------------------------------------------------------------------
const ID_VALUE = /^[A-Za-z0-9_.:-]{8,}$/;
function inspectQueryForSync(r, url, toDomain) {
  let u; try { u = new URL(url); } catch (e) { return; }
  for (const [k, v] of u.searchParams) {
    if (TRACKING_PARAMS.has(k)) r.queryParams.onRequests[k] = (r.queryParams.onRequests[k] || 0) + 1;
    if (!v || !ID_VALUE.test(v) || /^\d{1,4}$/.test(v)) continue;
    // Vazamento de cookie de 1ª parte (valor do cookie enviado a terceiro).
    const cookieName = r._cookieValues[v];
    if (cookieName) pushSync(r, { kind: 'cookie-leak', param: k, value: v, cookieName, toDomain, url: url.split('?')[0] });
    // Mesmo identificador compartilhado com ≥ 2 domínios de terceira parte.
    const set = r.cookieSync.identifiers[v] || (r.cookieSync.identifiers[v] = { param: k, domains: [] });
    if (!set.domains.includes(toDomain)) {
      set.domains.push(toDomain);
      if (set.domains.length >= 2) pushSync(r, { kind: 'shared-id', param: k, value: v, domains: [...set.domains], toDomain, url: url.split('?')[0] });
    }
    if (SYNC_PARAM_NAMES.test(k) && v.length >= 12) pushSync(r, { kind: 'sync-param', param: k, value: v, toDomain, url: url.split('?')[0] });
  }
}
function pushSync(r, ev) {
  const key = ev.kind + '|' + ev.param + '|' + ev.toDomain;
  if (r.cookieSync.events.some((e) => e.key === key)) return;
  if (r.cookieSync.events.length < 200) r.cookieSync.events.push({ ...ev, key, at: Date.now() });
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

// Interpreta um cabeçalho Set-Cookie: nome, persistência (Expires/Max-Age) e atributos.
function parseSetCookie(value) {
  const parts = value.split(';').map((p) => p.trim());
  const [name] = parts[0].split('=');
  const attrs = {};
  for (const p of parts.slice(1)) {
    const [k, v] = p.split('=');
    attrs[k.toLowerCase()] = v === undefined ? true : v;
  }
  let persistent = false;
  let expiresIn = null; // segundos
  if (attrs['max-age'] !== undefined) {
    const n = parseInt(attrs['max-age'], 10);
    persistent = n > 0; expiresIn = n;
  } else if (attrs.expires) {
    const t = Date.parse(attrs.expires);
    if (!isNaN(t)) { persistent = t > Date.now(); expiresIn = Math.round((t - Date.now()) / 1000); }
  }
  return {
    name: (name || '').trim(),
    persistent,
    expiresIn,
    domainAttr: attrs.domain || null,
    sameSite: attrs.samesite || null,
    secure: !!attrs.secure,
    httpOnly: !!attrs.httponly,
  };
}

browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    const r = reportForRequest(details);
    if (!r) return;
    const host = hostnameOf(details.url);
    const third = isThirdParty(details.url, r.url);
    for (const h of details.responseHeaders || []) {
      if (h.name.toLowerCase() !== 'set-cookie' || !h.value) continue;
      // Firefox junta múltiplos Set-Cookie com \n
      for (const line of h.value.split('\n')) {
        const c = parseSetCookie(line);
        if (!c.name) continue;
        const val = line.split(';')[0].split('=').slice(1).join('=').trim();
        if (!third && val.length >= 8) r._cookieValues[val] = c.name;
        r.cookies.setHeaders.push({
          ...c, host, domain: baseDomain(host), thirdParty: third,
          requestType: details.type, url: details.url.split('?')[0], at: Date.now(),
        });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Snapshot do cookie jar: cookies de primeira parte (URL da aba) e de terceira parte
// (domínios de terceiros observados na aba). Classifica sessão × persistente.
async function snapshotCookies(r) {
  const summarize = (list, thirdParty) => list.map((c) => ({
    name: c.name, domain: c.domain.replace(/^\./, ''), path: c.path,
    thirdParty, session: c.session,
    expires: c.session ? null : c.expirationDate * 1000,
    lifetimeDays: c.session ? 0 : Math.round((c.expirationDate * 1000 - Date.now()) / 86400000),
    secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
    valueLength: (c.value || '').length,
  }));
  let first = [];
  try { first = await browser.cookies.getAll({ url: r.url }); } catch (e) { /* about:, moz-extension: */ }
  const third = [];
  for (const dom of Object.keys(r.thirdParties)) {
    try {
      const list = await browser.cookies.getAll({ domain: dom });
      third.push(...list.filter((c) => baseDomain(c.domain.replace(/^\./, '')) === dom));
    } catch (e) { /* ignore */ }
  }
  const all = [...summarize(first, false), ...summarize(third, true)];
  r.cookies.summary = {
    total: all.length,
    firstParty: all.filter((c) => !c.thirdParty).length,
    thirdParty: all.filter((c) => c.thirdParty).length,
    session: all.filter((c) => c.session).length,
    persistent: all.filter((c) => !c.session).length,
    longLived: all.filter((c) => !c.session && c.lifetimeDays > 365).length,
    injectedHttp: r.cookies.setHeaders.length,
    injectedHttpThirdParty: r.cookies.setHeaders.filter((c) => c.thirdParty).length,
    injectedJs: r.cookies.jsSet.length,
    list: all,
  };
  return r.cookies.summary;
}

// ---------------------------------------------------------------------------
// Eventos do content script (storage, cookies via JS, fingerprinting, hijacking)
// ---------------------------------------------------------------------------
function frameIsThirdParty(r, frameUrl) {
  if (!frameUrl || frameUrl === 'about:blank' || frameUrl.startsWith('about:')) return false;
  return isThirdParty(frameUrl, r.url);
}

function handleStorageEvent(r, ev, frameUrl, third) {
  const d = ev.detail;
  const st = r.storage;
  const bucket = st[d.api] || st.localStorage;
  if (d.api === 'indexedDB') { bucket.opens++; bucket.databases[d.key] = (bucket.databases[d.key] || 0) + 1; }
  else if (d.api === 'cacheStorage') { bucket.opens++; bucket.caches[d.key] = (bucket.caches[d.key] || 0) + 1; }
  else {
    if (d.op === 'getItem') bucket.reads++; else bucket.writes++;
    if (d.key) bucket.keys[d.key] = (bucket.keys[d.key] || 0) + 1;
  }
  if (third) {
    const dom = baseDomain(hostnameOf(frameUrl));
    bucket.thirdPartyFrames[dom] = (bucket.thirdPartyFrames[dom] || 0) + 1;
  }
  if (st.events.length < 500) st.events.push({ ...d, frame: third ? baseDomain(hostnameOf(frameUrl)) : '1ª parte', at: ev.at });
}

function handleFingerprintEvent(r, ev, frameUrl, third) {
  const d = ev.detail;
  const fp = r.fingerprint;
  const src = d.script ? baseDomain(hostnameOf(d.script)) : (third ? baseDomain(hostnameOf(frameUrl)) : r.baseDomain);
  const bump = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };
  switch (d.api) {
    case 'canvas':
      fp.canvas.reads++;
      if (d.likely) fp.canvas.likely++;
      bump(fp.canvas.scripts, d.script || src);
      if (fp.canvas.samples.length < 20) fp.canvas.samples.push({ ...d, from: src, at: ev.at });
      break;
    case 'webgl':
      fp.webgl.calls++;
      if (d.method.startsWith('getParameter') || d.method.startsWith('getExtension')) fp.webgl.unmasked++;
      bump(fp.webgl.methods, d.method); bump(fp.webgl.scripts, d.script || src);
      break;
    case 'audio':
      fp.audio.calls++; bump(fp.audio.methods, d.method); bump(fp.audio.scripts, d.script || src);
      break;
    case 'fonts':
      fp.fonts.measureText++; bump(fp.fonts.scripts, d.script || src);
      break;
    case 'enumeration':
      bump(fp.enumeration.props, d.method);
      { const s = fp.enumeration.scripts[d.script || src] || (fp.enumeration.scripts[d.script || src] = {}); bump(s, d.method); }
      break;
  }
  // Nível agregado
  const enumMax = Math.max(0, ...Object.values(fp.enumeration.scripts).map((s) => Object.keys(s).length));
  const audioFp = fp.audio.methods['createOscillator'] && fp.audio.methods['createDynamicsCompressor'] && fp.audio.methods['getChannelData'];
  if (fp.canvas.likely > 0 || audioFp || (fp.webgl.unmasked > 0 && enumMax >= 6)) fp.level = 'likely';
  else if (fp.canvas.reads > 0 || fp.webgl.unmasked > 0 || fp.fonts.measureText > 30 || enumMax >= 8) fp.level = 'possible';
}

function handleHijackEvent(r, ev, frameUrl, third) {
  const d = ev.detail;
  const h = r.hijack;
  const scriptDomain = d.script ? baseDomain(hostnameOf(d.script)) : null;
  const scriptThird = scriptDomain ? scriptDomain !== r.baseDomain : third;
  switch (d.kind) {
    case 'websocket': {
      const dom = baseDomain(hostnameOf(d.url.replace(/^ws/, 'http')));
      if (!h.websockets.some((w) => w.url === d.url)) h.websockets.push({ url: d.url, domain: dom, thirdParty: dom !== r.baseDomain, script: d.script, via: 'content', blocked: !!d.blocked, at: ev.at });
      if (d.blocked) r.blockedTotal = (r.blockedTotal || 0) + 1;
      break;
    }
    case 'eventsource': {
      const dom = baseDomain(hostnameOf(d.url));
      h.eventsources.push({ url: d.url, domain: dom, thirdParty: dom !== r.baseDomain, script: d.script, at: ev.at });
      break;
    }
    case 'input-listener':
      if (h.inputListeners.length < 200) h.inputListeners.push({ event: d.event, target: d.target, script: d.script || (third ? frameUrl : '(inline)'), scriptDomain, thirdParty: scriptThird, at: ev.at });
      break;
    case 'motion-listener': {
      const k = d.script || (third ? frameUrl : '(inline)');
      h.motionListeners[k] = (h.motionListeners[k] || 0) + 1;
      break;
    }
    case 'integrity':
      if (!third) { // integridade só do frame principal
        h.overridden = d.overridden;
        h.newGlobals = d.newGlobals;
        h.newGlobalsCount = d.newGlobalsCount;
        h.integrityPhase = d.phase;
      }
      break;
  }
  updateHijackLevel(r);
}

const contentHandlers = {
  hijack: handleHijackEvent,
  fingerprint: handleFingerprintEvent,
  frame(r, ev, frameUrl, third) {
    r.frames[frameUrl] = { thirdParty: third, hooked: ev.detail.hooked };
  },
  storage: handleStorageEvent,
  cookieJs(r, ev, frameUrl, third) {
    r.cookies.jsSet.push({ ...ev.detail, thirdParty: third, frame: baseDomain(hostnameOf(frameUrl)), at: ev.at });
  },
};

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'contentEvents' || !sender.tab) return;
  const r = reports.get(sender.tab.id);
  if (!r) return;
  const frameUrl = sender.url || '';
  const third = frameIsThirdParty(r, frameUrl);
  if (sender.frameId === 0 && third) {
    const b = r.navigation.bounces.find((x) => x.url === frameUrl);
    if (b) {
      b.evidence = b.evidence || { cookiesJs: [], cookiesHttp: [], storageKeys: [], requests: 0 };
      for (const ev of msg.events) {
        if (ev.kind === 'cookieJs') b.evidence.cookiesJs.push(ev.detail.raw);
        if (ev.kind === 'storage' && ev.detail.key && ev.detail.op !== 'getItem') b.evidence.storageKeys.push(ev.detail.api + ':' + ev.detail.key);
      }
      return;
    }
  }
  for (const ev of msg.events) {
    const h = contentHandlers[ev.kind];
    if (h) h(r, ev, frameUrl, third);
  }
});

// API para o popup.
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'getReport') {
    const r = reports.get(msg.tabId);
    if (!r) return Promise.resolve(null);
    return snapshotCookies(r).then(() => {
      r.score = computeScore(r);
      r.settings = { ...settings };
      const { _timeline, _cookieValues, ...publicReport } = r;
      return publicReport;
    });
  }
  if (msg.type === 'getSettings') return Promise.resolve({ ...settings });
  if (msg.type === 'saveSettings') {
    return browser.storage.local.set({
      blocklist: (msg.blocklist || []).map((d) => d.trim().toLowerCase()).filter(Boolean),
      blockKnownTrackers: !!msg.blockKnownTrackers,
    });
  }
});
