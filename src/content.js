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

  // -------------------------------------------------------------------------
  // Fingerprinting
  // -------------------------------------------------------------------------
  // Canvas — heurística de Englehardt & Narayanan (usada pelo Blacklight):
  // fingerprint provável se houve fillText/strokeText e depois uma leitura (toDataURL,
  // toBlob, getImageData) de área >= 16x16. Canvas fora do DOM reforça a suspeita.
  const canvasState = new WeakMap(); // canvas -> { text, draws }
  function canvasOf(ctx) { try { return unwrap(ctx).canvas; } catch (e) { return null; } }
  function markDraw(ctx, text) {
    const c = canvasOf(ctx); if (!c) return;
    const st = canvasState.get(c) || { text: 0, draws: 0 };
    st.draws++; if (text) st.text++;
    canvasState.set(c, st);
  }
  for (const m of ['fillText', 'strokeText']) {
    hookMethod(page.CanvasRenderingContext2D && page.CanvasRenderingContext2D.prototype, m, (self) => markDraw(self, true), 'Canvas2D.' + m);
  }
  for (const m of ['fillRect', 'arc', 'bezierCurveTo', 'drawImage', 'fill']) {
    hookMethod(page.CanvasRenderingContext2D && page.CanvasRenderingContext2D.prototype, m, (self) => markDraw(self, false), 'Canvas2D.' + m);
  }
  function canvasRead(canvas, method, area) {
    const c = unwrap(canvas); if (!c) return;
    const st = canvasState.get(c) || { text: 0, draws: 0 };
    const w = c.width || 0, h = c.height || 0;
    const readArea = area != null ? area : w * h;
    const attached = !!(c.isConnected);
    const likely = st.text > 0 && readArea >= 256;
    report('fingerprint', { api: 'canvas', method, width: w, height: h, readArea, textDrawn: st.text, draws: st.draws,
      attached, likely, script: callerScript() });
  }
  hookMethod(page.HTMLCanvasElement && page.HTMLCanvasElement.prototype, 'toDataURL', (self) => canvasRead(self, 'toDataURL'), 'Canvas.toDataURL');
  hookMethod(page.HTMLCanvasElement && page.HTMLCanvasElement.prototype, 'toBlob', (self) => canvasRead(self, 'toBlob'), 'Canvas.toBlob');
  hookMethod(page.CanvasRenderingContext2D && page.CanvasRenderingContext2D.prototype, 'getImageData', (self, args) => {
    const c = canvasOf(self); if (c) canvasRead(c, 'getImageData', Math.abs((args[2] || 0) * (args[3] || 0)));
  }, 'Canvas2D.getImageData');
  hookMethod(page.CanvasRenderingContext2D && page.CanvasRenderingContext2D.prototype, 'measureText', () => {
    report('fingerprint', { api: 'fonts', method: 'measureText', script: callerScript() });
  }, 'Canvas2D.measureText');

  // WebGL — leitura de vendor/renderer "desmascarados", extensões e pixels.
  const UNMASKED = new Set([0x9245, 0x9246]); // UNMASKED_VENDOR_WEBGL, UNMASKED_RENDERER_WEBGL
  for (const ctxName of ['WebGLRenderingContext', 'WebGL2RenderingContext']) {
    const proto = page[ctxName] && page[ctxName].prototype;
    hookMethod(proto, 'getParameter', (self, args) => {
      if (UNMASKED.has(args[0])) report('fingerprint', { api: 'webgl', method: 'getParameter(UNMASKED_*)', script: callerScript() });
    }, ctxName + '.getParameter');
    hookMethod(proto, 'getExtension', (self, args) => {
      if (String(args[0]) === 'WEBGL_debug_renderer_info') report('fingerprint', { api: 'webgl', method: 'getExtension(debug_renderer_info)', script: callerScript() });
    }, ctxName + '.getExtension');
    hookMethod(proto, 'getSupportedExtensions', () => report('fingerprint', { api: 'webgl', method: 'getSupportedExtensions', script: callerScript() }), ctxName + '.getSupportedExtensions');
    hookMethod(proto, 'readPixels', () => report('fingerprint', { api: 'webgl', method: 'readPixels', script: callerScript() }), ctxName + '.readPixels');
    hookMethod(proto, 'getShaderPrecisionFormat', () => report('fingerprint', { api: 'webgl', method: 'getShaderPrecisionFormat', script: callerScript() }), ctxName + '.getShaderPrecisionFormat');
  }

  // Áudio — padrão clássico: OfflineAudioContext + oscilador + compressor + leitura do buffer.
  if (page.OfflineAudioContext) {
    const OrigOffline = page.OfflineAudioContext;
    HOOKED.add('OfflineAudioContext');
    const Wrapped = exportFunction(function (...args) {
      report('fingerprint', { api: 'audio', method: 'new OfflineAudioContext', script: callerScript() });
      return Reflect.construct(OrigOffline, args, new.target || OrigOffline);
    }, page, { defineAs: 'OfflineAudioContext' });
    try { Wrapped.prototype = OrigOffline.prototype; } catch (e) {}
  }
  hookMethod(page.BaseAudioContext && page.BaseAudioContext.prototype, 'createOscillator', () => report('fingerprint', { api: 'audio', method: 'createOscillator', script: callerScript() }), 'Audio.createOscillator');
  hookMethod(page.BaseAudioContext && page.BaseAudioContext.prototype, 'createDynamicsCompressor', () => report('fingerprint', { api: 'audio', method: 'createDynamicsCompressor', script: callerScript() }), 'Audio.createDynamicsCompressor');
  hookMethod(page.AudioBuffer && page.AudioBuffer.prototype, 'getChannelData', () => report('fingerprint', { api: 'audio', method: 'getChannelData', script: callerScript() }), 'AudioBuffer.getChannelData');
  hookMethod(page.AnalyserNode && page.AnalyserNode.prototype, 'getFloatFrequencyData', () => report('fingerprint', { api: 'audio', method: 'getFloatFrequencyData', script: callerScript() }), 'Analyser.getFloatFrequencyData');

  // Enumeração de navigator/screen — cada acesso é contado por propriedade e por script.
  const NAV_PROPS = ['userAgent', 'platform', 'language', 'languages', 'hardwareConcurrency', 'deviceMemory',
    'plugins', 'mimeTypes', 'doNotTrack', 'maxTouchPoints', 'webdriver', 'vendor', 'oscpu', 'buildID', 'productSub', 'cookieEnabled'];
  const SCREEN_PROPS = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
  const propCounts = {};
  function countProp(obj, prop) {
    const key = obj + '.' + prop;
    propCounts[key] = (propCounts[key] || 0) + 1;
    if (propCounts[key] <= 3) report('fingerprint', { api: 'enumeration', method: key, script: callerScript() });
  }
  for (const p of NAV_PROPS) hookAccessor(page.Navigator && page.Navigator.prototype, p, { onGet: () => countProp('navigator', p) }, 'navigator.' + p);
  for (const p of SCREEN_PROPS) hookAccessor(page.Screen && page.Screen.prototype, p, { onGet: () => countProp('screen', p) }, 'screen.' + p);
  hookMethod(page.Date && page.Date.prototype, 'getTimezoneOffset', () => countProp('Date', 'getTimezoneOffset'), 'Date.getTimezoneOffset');
  hookMethod(page.MediaDevices && page.MediaDevices.prototype, 'enumerateDevices', () => report('fingerprint', { api: 'enumeration', method: 'mediaDevices.enumerateDevices', script: callerScript() }), 'enumerateDevices');
  hookMethod(page.SpeechSynthesis && page.SpeechSynthesis.prototype, 'getVoices', () => report('fingerprint', { api: 'enumeration', method: 'speechSynthesis.getVoices', script: callerScript() }), 'getVoices');
  hookMethod(page.Navigator && page.Navigator.prototype, 'getBattery', () => report('fingerprint', { api: 'enumeration', method: 'navigator.getBattery', script: callerScript() }), 'getBattery');

  report('frame', { hooked: [...HOOKED] });
})();
