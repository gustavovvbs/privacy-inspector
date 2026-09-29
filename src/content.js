// Privacy Inspector — content script (document_start, todos os frames).
// Instala hooks no contexto da página via wrappedJSObject/exportFunction (API do Firefox),
// o que funciona mesmo em páginas com Content-Security-Policy restritiva.
(function () {
  'use strict';
  if (typeof exportFunction !== 'function' || !window.wrappedJSObject) return;

  const page = window.wrappedJSObject;
  const isTop = window === window.top;
  const frameUrl = location.href;

  // -------------------------------------------------------------------------
  // Canal de eventos para o background (agrupa em lotes de 200 ms)
  // -------------------------------------------------------------------------
  const queue = [];
  let flushTimer = null;
  function report(kind, detail) {
    queue.push({ kind, detail, frameUrl, top: isTop, at: Date.now() });
    if (!flushTimer) flushTimer = setTimeout(flush, 200);
  }
  function flush() {
    flushTimer = null;
    const batch = queue.splice(0, queue.length);
    if (!batch.length) return;
    try { browser.runtime.sendMessage({ type: 'contentEvents', events: batch }).catch(() => {}); } catch (e) { /* frame descartado */ }
  }
  window.addEventListener('pagehide', flush);

  // Captura o "caller" (script que invocou a API) a partir da stack.
  function callerScript() {
    const stack = (new Error()).stack || '';
    const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const m = l.match(/(https?:\/\/[^\s):]+)/);
      if (m && !m[1].startsWith('moz-extension://')) return m[1].split('?')[0];
    }
    return null;
  }

  function unwrap(o) { return (o && o.wrappedJSObject) || o; }

  // Substitui page[obj][name] por um wrapper que chama `before` e delega ao original.
  const HOOKED = new Set();
  function hookMethod(proto, name, before, label) {
    if (!proto) return;
    const orig = proto[name];
    if (typeof orig !== 'function') return;
    HOOKED.add(label || name);
    exportFunction(function (...args) {
      try { before(this, args); } catch (e) { /* nunca quebrar a página */ }
      return Reflect.apply(orig, this, args);
    }, proto, { defineAs: name });
  }

  // Substitui um accessor (getter/setter) mantendo o comportamento original.
  function hookAccessor(proto, name, { onGet, onSet }, label) {
    if (!proto) return;
    const desc = Object.getOwnPropertyDescriptor(proto, name);
    if (!desc || (!desc.get && !desc.set)) return;
    HOOKED.add(label || name);
    const newDesc = { configurable: true, enumerable: desc.enumerable };
    if (desc.get) newDesc.get = exportFunction(function () {
      try { if (onGet) onGet(this); } catch (e) {}
      return Reflect.apply(desc.get, this, []);
    }, page);
    if (desc.set) newDesc.set = exportFunction(function (v) {
      try { if (onSet) onSet(this, v); } catch (e) {}
      return Reflect.apply(desc.set, this, [v]);
    }, page);
    Object.defineProperty(proto, name, newDesc);
  }

  // -------------------------------------------------------------------------
  // Armazenamento HTML5: Web Storage, IndexedDB, Cache API, document.cookie
  // -------------------------------------------------------------------------
  function storageKind(self) {
    const raw = unwrap(self);
    if (raw === page.localStorage) return 'localStorage';
    if (raw === page.sessionStorage) return 'sessionStorage';
    return 'storage';
  }
  for (const op of ['setItem', 'getItem', 'removeItem', 'clear']) {
    hookMethod(page.Storage && page.Storage.prototype, op, (self, args) => {
      report('storage', { api: storageKind(self), op, key: args[0] != null ? String(args[0]).slice(0, 80) : null,
        valueLength: op === 'setItem' && args[1] != null ? String(args[1]).length : null, script: callerScript() });
    }, 'Storage.' + op);
  }
  hookMethod(page.IDBFactory && page.IDBFactory.prototype, 'open', (self, args) => {
    report('storage', { api: 'indexedDB', op: 'open', key: String(args[0]).slice(0, 80), script: callerScript() });
  }, 'IDBFactory.open');
  hookMethod(page.CacheStorage && page.CacheStorage.prototype, 'open', (self, args) => {
    report('storage', { api: 'cacheStorage', op: 'open', key: String(args[0]).slice(0, 80), script: callerScript() });
  }, 'CacheStorage.open');

  hookAccessor(page.Document && page.Document.prototype, 'cookie', {
    onSet: (self, value) => {
      const str = String(value);
      const [pair, ...attrs] = str.split(';');
      const name = pair.split('=')[0].trim();
      const persistent = attrs.some((a) => /^\s*(max-age|expires)\s*=/i.test(a));
      report('cookieJs', { name: name.slice(0, 80), persistent, raw: str.slice(0, 200), script: callerScript() });
    },
  }, 'Document.cookie');

  report('frame', { hooked: [...HOOKED] });
})();
