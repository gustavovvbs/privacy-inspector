// Utilidades de domínio compartilhadas pelo background e popup.
// Aproximação de eTLD+1 (Public Suffix List reduzida aos sufixos multi-nível mais comuns).
const MULTI_LEVEL_SUFFIXES = new Set([
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'art.br', 'blog.br', 'eco.br', 'adv.br',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'com.au', 'net.au', 'org.au', 'com.ar', 'com.mx', 'com.co', 'com.pe', 'com.cl',
  'co.jp', 'ne.jp', 'or.jp', 'co.kr', 'co.in', 'co.za', 'com.tr', 'com.cn', 'com.hk',
  'com.sg', 'com.tw', 'co.nz', 'com.pt', 'com.es', 'com.pl', 'com.ru',
  'github.io', 'cloudfront.net', 'amazonaws.com', 'herokuapp.com', 'azurewebsites.net',
  'firebaseapp.com', 'web.app', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev',
]);

function hostnameOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; }
}

function baseDomain(hostname) {
  if (!hostname) return '';
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return hostname; // IP
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  const last2 = parts.slice(-2).join('.');
  if (MULTI_LEVEL_SUFFIXES.has(last2)) return parts.slice(-3).join('.');
  return last2;
}

function isThirdParty(requestUrl, pageUrl) {
  const a = baseDomain(hostnameOf(requestUrl));
  const b = baseDomain(hostnameOf(pageUrl));
  if (!a || !b) return false;
  return a !== b;
}

if (typeof module !== 'undefined') module.exports = { hostnameOf, baseDomain, isThirdParty };
