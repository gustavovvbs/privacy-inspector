// Pontuação de privacidade. Parte de 100 e aplica deduções por critério, com teto por critério
// para que nenhum eixo domine a nota. Metodologia detalhada em docs/metodologia-pontuacao.md.
const SCORE_RULES = [
  { id: 'trackers',        label: 'Rastreadores conhecidos (3ª parte)',      perItem: 4,  cap: 32 },
  { id: 'thirdParties',    label: 'Outros domínios de 3ª parte',             perItem: 1,  cap: 8 },
  { id: 'thirdPartyCookies', label: 'Cookies de 3ª parte',                   perItem: 2,  cap: 16 },
  { id: 'longLivedCookies', label: 'Cookies persistentes > 1 ano',            perItem: 1,  cap: 6 },
  { id: 'fingerprinting',  label: 'Fingerprinting (provável 15 / possível 7)', fixed: true, cap: 15 },
  { id: 'sessionRecording', label: 'Gravação de sessão / heatmap',           fixed: 10,  cap: 10 },
  { id: 'keyLogging',      label: 'Captura de teclado por 3ª parte',          fixed: 10,  cap: 10 },
  { id: 'facebookPixel',   label: 'Pixel do Facebook/Meta',                   fixed: 6,   cap: 6 },
  { id: 'googleAds',       label: 'Remarketing Google (DoubleClick/Ads)',     fixed: 4,   cap: 4 },
  { id: 'cookieSync',      label: 'Cookie sync / vazamento de identificador', fixed: true, cap: 8 },
  { id: 'bounceTracking',  label: 'Bounce tracking',                          fixed: 6,   cap: 6 },
  { id: 'thirdPartyStorage', label: 'Storage HTML5 em frames de 3ª parte',    fixed: 4,   cap: 4 },
  { id: 'hijacking',       label: 'Indicadores de hijacking (alto 15 / médio 8 / baixo 3)', fixed: true, cap: 15 },
];

function gradeFor(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'E';
}

function computeScore(r) {
  const tp = Object.values(r.thirdParties);
  const trackers = tp.filter((t) => t.tracker);
  const cookies = r.cookies.summary || { thirdParty: 0, longLived: 0 };
  const hasCat = (cat) => trackers.some((t) => t.category === cat);
  const hasOwner = (re) => trackers.some((t) => re.test(t.owner || ''));
  const keylog = r.hijack.inputListeners.filter((l) => l.thirdParty && l.target === 'document').length;
  const syncStrong = r.cookieSync.events.filter((e) => e.kind === 'cookie-leak' || e.kind === 'shared-id').length;
  const syncWeak = r.cookieSync.events.filter((e) => e.kind === 'sync-param').length + r.cookieSync.redirects.length;
  const storage3p = ['localStorage', 'sessionStorage', 'indexedDB', 'cacheStorage']
    .reduce((n, k) => n + Object.keys(r.storage[k].thirdPartyFrames).length, 0);

  const raw = {
    trackers: trackers.length * 4,
    thirdParties: (tp.length - trackers.length) * 1,
    thirdPartyCookies: cookies.thirdParty * 2,
    longLivedCookies: cookies.longLived * 1,
    fingerprinting: r.fingerprint.level === 'likely' ? 15 : r.fingerprint.level === 'possible' ? 7 : 0,
    sessionRecording: hasCat('session-recording') ? 10 : 0,
    keyLogging: keylog > 0 ? 10 : 0,
    facebookPixel: hasOwner(/Meta|Facebook/) ? 6 : 0,
    googleAds: trackers.some((t) => /doubleclick|googlesyndication|googleadservices|adservice\.google/.test(t.tracker)) ? 4 : 0,
    cookieSync: syncStrong > 0 ? 8 : syncWeak > 0 ? 4 : 0,
    bounceTracking: r.navigation.bounces.length > 0 ? 6 : 0,
    thirdPartyStorage: storage3p > 0 ? 4 : 0,
    hijacking: r.hijack.level === 'high' ? 15 : r.hijack.level === 'medium' ? 8 : r.hijack.level === 'low' ? 3 : 0,
  };
  const breakdown = SCORE_RULES.map((rule) => {
    const penalty = Math.min(raw[rule.id] || 0, rule.cap);
    return { id: rule.id, label: rule.label, penalty, cap: rule.cap };
  });
  const total = breakdown.reduce((n, b) => n + b.penalty, 0);
  const score = Math.max(0, 100 - total);
  return { score, grade: gradeFor(score), breakdown, counts: { trackers: trackers.length, thirdParties: tp.length,
    thirdPartyCookies: cookies.thirdParty, longLived: cookies.longLived, keylog, syncStrong, syncWeak, storage3p } };
}
