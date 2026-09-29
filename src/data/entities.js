// Domínios que pertencem à mesma organização da página ("afiliados"). São tecnicamente 3ª parte
// (eTLD+1 diferente), mas não representam rastreamento entre sites: CDNs e serviços próprios.
// O plugin os lista com o rótulo "afiliado" e os exclui das contagens de terceiros e da pontuação.
const ENTITIES = [
  ['uol.com.br', 'jsuol.com.br', 'imguol.com.br', 'uol.com', 'jsuol.com', 'imguol.com'],
  ['terra.com.br', 'trrsf.com', 'trrsf.com.br'],
  ['mercadolivre.com.br', 'mercadolivre.com', 'mercadolibre.com', 'mlstatic.com', 'mercadoclics.com', 'mercadopago.com', 'mercadopago.com.br', 'meli.com', 'mercadoshops.com.br'],
  ['globo.com', 'glbimg.com', 'globoi.com', 'g1.globo.com'],
  ['google.com', 'gstatic.com', 'googleapis.com', 'googleusercontent.com', 'youtube.com', 'ytimg.com', 'ggpht.com'],
  ['facebook.com', 'fbcdn.net', 'facebook.net', 'instagram.com', 'cdninstagram.com'],
  ['amazon.com', 'amazon.com.br', 'media-amazon.com', 'ssl-images-amazon.com', 'amazonaws.com'],
  ['microsoft.com', 'msftstatic.com', 'live.com', 'bing.com', 'msn.com'],
  ['apple.com', 'mzstatic.com', 'cdn-apple.com'],
  ['nytimes.com', 'nyt.com'], ['bbc.co.uk', 'bbci.co.uk', 'bbc.com'],
  ['wikipedia.org', 'wikimedia.org'], ['reddit.com', 'redditstatic.com', 'redd.it'],
  ['twitter.com', 'x.com', 'twimg.com'], ['linkedin.com', 'licdn.com'],
  ['folha.uol.com.br', 'folha.com.br', 'f.i.uol.com.br'], ['estadao.com.br', 'estadao.com'],
  ['magazineluiza.com.br', 'magalu.com', 'mlcdn.com.br'], ['americanas.com.br', 'americanas.io', 'b2w.io'],
  ['casasbahia.com.br', 'viavarejo.com.br'], ['ifood.com.br', 'ifood.com'], ['nubank.com.br', 'nubank.com'],
  ['itau.com.br', 'itau.com', 'cloud.itau.com.br'], ['bb.com.br', 'bancodobrasil.com.br'],
];
const ENTITY_OF = {};
ENTITIES.forEach((group, i) => group.forEach((d) => { ENTITY_OF[d] = i; }));

function registrableLabel(domain) { return (domain || '').split('.')[0]; }

// Mesma entidade se estiverem no mesmo grupo explícito, ou se o rótulo registrável de um contiver o do
// outro (ex.: "mercadolivre" ⊂ "mercadolivre.com"), com rótulo mínimo de 5 caracteres para evitar
// coincidências. Rastreadores conhecidos só são afiliados por grupo explícito.
function sameEntity(pageDomain, otherDomain) {
  if (!pageDomain || !otherDomain || pageDomain === otherDomain) return pageDomain === otherDomain;
  const a = ENTITY_OF[pageDomain], b = ENTITY_OF[otherDomain];
  if (a !== undefined && b !== undefined) return a === b;
  if (typeof TRACKERS !== 'undefined' && TRACKERS[otherDomain]) return false;
  const la = registrableLabel(pageDomain), lb = registrableLabel(otherDomain);
  if (la.length >= 5 && lb.length >= 5 && (la.includes(lb) || lb.includes(la))) return true;
  return false;
}
