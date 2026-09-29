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

// Reinicia o relatório a cada navegação de topo (nova página).
browser.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  reports.set(details.tabId, newReport(details.url));
});

browser.tabs.onRemoved.addListener((tabId) => reports.delete(tabId));

function recordRequest(details) {
  if (details.tabId < 0) return;
  const r = reports.get(details.tabId);
  if (!r) return;
  r.requestsTotal++;
  const host = hostnameOf(details.url);
  if (!host || !isThirdParty(details.url, r.url)) return;
  r.requestsThirdParty++;
  const dom = baseDomain(host);
  const entry = r.thirdParties[dom] || (r.thirdParties[dom] = {
    domain: dom, hosts: {}, requests: 0, types: {}, tracker: null, category: null, blocked: 0,
  });
  entry.requests++;
  entry.hosts[host] = (entry.hosts[host] || 0) + 1;
  entry.types[details.type] = (entry.types[details.type] || 0) + 1;
  if (!entry.tracker) {
    const t = classifyTracker(host);
    if (t) { entry.tracker = t.domain; entry.category = t.category; entry.owner = t.owner; }
  }
  return entry;
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => { recordRequest(details); },
  { urls: ['<all_urls>'] },
  ['blocking']
);

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
    if (details.tabId < 0) return;
    const r = reports.get(details.tabId);
    if (!r) return;
    const host = hostnameOf(details.url);
    const third = isThirdParty(details.url, r.url);
    for (const h of details.responseHeaders || []) {
      if (h.name.toLowerCase() !== 'set-cookie' || !h.value) continue;
      // Firefox junta múltiplos Set-Cookie com \n
      for (const line of h.value.split('\n')) {
        const c = parseSetCookie(line);
        if (!c.name) continue;
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

const contentHandlers = {
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
  const third = sender.frameId !== 0 && frameIsThirdParty(r, frameUrl);
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
    return snapshotCookies(r).then(() => r);
  }
});
