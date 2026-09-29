// Lista inicial de domínios rastreadores (preenchida em commit posterior).
const TRACKERS = {};
function classifyTracker(hostname) {
  const parts = hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const cand = parts.slice(i).join('.');
    if (TRACKERS[cand]) return { domain: cand, ...TRACKERS[cand] };
  }
  return null;
}
