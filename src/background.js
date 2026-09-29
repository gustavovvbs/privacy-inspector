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

// API para o popup.
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'getReport') {
    return Promise.resolve(reports.get(msg.tabId) || null);
  }
});
