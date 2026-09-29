// Lista curada de domínios rastreadores, agrupados por categoria.
// Categorias alinhadas ao que o Blacklight (The Markup) reporta, para facilitar a reconciliação:
//   advertising        – redes de anúncios / RTB / DMPs (Blacklight: "ad trackers")
//   analytics          – métricas de audiência
//   social             – pixels/botões de redes sociais (Blacklight: "Facebook pixel")
//   session-recording  – gravação de sessão / heatmaps (Blacklight: "session recorders", "key logging")
//   fingerprinting     – serviços dedicados de fingerprint / antifraude
//   identity           – cookie sync / ID graphs / resolução de identidade
//   test               – domínios das DuckDuckGo Privacy Test Pages
const TRACKER_GROUPS = {
  advertising: {
    'Google': ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adservice.google.com',
      'googletagservices.com', '2mdn.net', 'admob.com'],
    'Google (YouTube embed)': ['youtube.com', 'ytimg.com', 'youtube-nocookie.com'],
    'Amazon': ['amazon-adsystem.com'],
    'Microsoft': ['bat.bing.com', 'ads.linkedin.com', 'snap.licdn.com', 'px.ads.linkedin.com'],
    'Criteo': ['criteo.com', 'criteo.net'],
    'Xandr/AppNexus': ['adnxs.com', 'adnxs-simple.com'],
    'Magnite/Rubicon': ['rubiconproject.com'],
    'PubMatic': ['pubmatic.com'],
    'OpenX': ['openx.net'],
    'Index Exchange': ['casalemedia.com', 'indexww.com'],
    'Taboola': ['taboola.com'],
    'Outbrain': ['outbrain.com', 'zemanta.com'],
    'The Trade Desk': ['adsrvr.org'],
    'BidSwitch': ['bidswitch.net'],
    'Smart AdServer': ['smartadserver.com', 'sascdn.com'],
    'Teads': ['teads.tv'],
    'Sharethrough': ['sharethrough.com'],
    'Yieldmo': ['yieldmo.com'],
    '33Across': ['33across.com'],
    'Media.net': ['media.net'],
    'MediaMath': ['mathtag.com'],
    'Quantcast': ['quantserve.com', 'quantcount.com'],
    'Adform': ['adform.net'],
    'Sovrn': ['lijit.com', 'sovrn.com'],
    'TripleLift': ['3lift.com'],
    'Yahoo': ['advertising.com', 'adtechus.com', 'yahoo.com'],
    'Navegg (BR)': ['navdmp.com'],
    'Tail (BR)': ['tailtarget.com'],
    'Predicta (BR)': ['predicta.net'],
    'RTB House': ['creativecdn.com'],
    'Seedtag': ['seedtag.com'],
    'Adsmovil': ['adsmovil.com'],
  },
  analytics: {
    'Google Analytics': ['google-analytics.com', 'analytics.google.com', 'googletagmanager.com'],
    'Adobe Analytics': ['omtrdc.net', '2o7.net', 'demdex.net', 'everesttech.net', 'adobedtm.com'],
    'comScore': ['scorecardresearch.com'],
    'Nielsen': ['imrworldwide.com'],
    'Chartbeat': ['chartbeat.com', 'chartbeat.net'],
    'Parse.ly': ['parsely.com'],
    'Segment': ['segment.com', 'segment.io'],
    'Mixpanel': ['mixpanel.com'],
    'Amplitude': ['amplitude.com'],
    'Heap': ['heapanalytics.com'],
    'New Relic': ['newrelic.com', 'nr-data.net'],
    'Yandex Metrica': ['mc.yandex.ru', 'yandex.ru'],
    'Matomo': ['matomo.cloud'],
    'Marfeel': ['mrf.io', 'marfeel.com'],
    'Piano (Tinypass)': ['tinypass.com', 'piano.io'],
    'Newsroom AI': ['newsroom.bi'],
    'Permutive': ['permutive.com', 'permutive.app', 'prmutv.co'],
    'Optimizely': ['optimizely.com'],
    'Branch': ['branch.io', 'app.link'],
    'AppsFlyer': ['appsflyer.com'],
    'Adjust': ['adjust.com'],
    'Salesforce': ['krxd.net', 'exelator.com', 'evgnet.com'],
    'Oracle': ['bluekai.com', 'bkrtx.com', 'addthis.com'],
    'Datadog RUM': ['browser-intake-datadoghq.com', 'datadoghq.com'],
  },
  social: {
    'Meta (Facebook pixel)': ['facebook.net', 'connect.facebook.net', 'facebook.com', 'fbcdn.net'],
    'Twitter/X': ['ads-twitter.com', 'analytics.twitter.com', 't.co', 'static.ads-twitter.com'],
    'TikTok': ['analytics.tiktok.com', 'tiktok.com'],
    'Pinterest': ['ct.pinterest.com', 'pinimg.com'],
    'LinkedIn': ['linkedin.com', 'licdn.com'],
    'Snapchat': ['sc-static.net', 'tr.snapchat.com'],
    'Reddit': ['redditstatic.com', 'alb.reddit.com'],
  },
  'session-recording': {
    'Hotjar': ['hotjar.com', 'hotjar.io'],
    'FullStory': ['fullstory.com'],
    'Mouseflow': ['mouseflow.com'],
    'Microsoft Clarity': ['clarity.ms'],
    'Crazy Egg': ['crazyegg.com'],
    'Smartlook': ['smartlook.com', 'smartlook.cloud'],
    'Lucky Orange': ['luckyorange.com', 'luckyorange.net'],
    'LogRocket': ['logrocket.com', 'lr-ingest.io', 'lr-in.com'],
    'Inspectlet': ['inspectlet.com'],
    'SessionCam': ['sessioncam.com'],
    'Contentsquare': ['contentsquare.net', 'contentsquare.com'],
    'Quantum Metric': ['quantummetric.com'],
    'Glassbox': ['glassboxdigital.io'],
    'Dynatrace': ['dynatrace.com'],
  },
  fingerprinting: {
    'FingerprintJS': ['fpjs.io', 'fingerprint.com', 'fpcdn.io'],
    'ThreatMetrix': ['online-metrix.net'],
    'iovation': ['iovation.com', 'iesnare.com'],
    'Sift': ['sift.com', 'siftscience.com'],
    'PerimeterX / HUMAN': ['px-cloud.net', 'px-cdn.net', 'perimeterx.net'],
    'DataDome': ['datadome.co', 'captcha-delivery.com'],
    'Forter': ['forter.com'],
    'ClearSale (BR)': ['clearsale.com.br'],
    'Konduto (BR)': ['konduto.com'],
    'Riskified': ['riskified.com'],
    'Signifyd': ['signifyd.com'],
  },
  identity: {
    'LiveRamp': ['rlcdn.com', 'liveramp.com', 'pippio.com'],
    'LiveRamp ATS / Privacy Manager': ['privacymanager.io'],
    'LiveIntent': ['liadm.com'],
    'ID5': ['id5-sync.com'],
    'Tapad': ['tapad.com'],
    'Neustar': ['agkn.com'],
    'Lotame': ['crwdcntrl.net'],
    'Semasio': ['semasio.net'],
    'Zeotap': ['zeotap.com'],
    'Eyeota': ['eyeota.net'],
    'Turn/Amobee': ['turn.com', 'amobee.com'],
    'Rocket Fuel': ['rfihub.com'],
  },
  test: {
    'DDG Privacy Test Pages': ['bad.third-party.site', 'broken.third-party.site'],
  },
};

// Índice plano: domínio -> { category, owner }
const TRACKERS = {};
for (const [category, owners] of Object.entries(TRACKER_GROUPS)) {
  for (const [owner, domains] of Object.entries(owners)) {
    for (const d of domains) TRACKERS[d] = { category, owner };
  }
}

// Retorna a entrada do rastreador cujo domínio é sufixo do hostname (ex.: www.google-analytics.com).
function classifyTracker(hostname) {
  if (!hostname) return null;
  const parts = hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join('.');
    if (TRACKERS[cand]) return { domain: cand, ...TRACKERS[cand] };
  }
  return null;
}
