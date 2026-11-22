// Tournée des calendriers : works without network once opened (cache of the app, the map and the fonts)
const CACHE = 'tournee-2026-11-22';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const MAP = ['./plan-fond.webp', './plan-fond-2.webp'];   // map background: optional (the app draws the streets without it)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => Promise.all(MAP.map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tournee-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(r => { clearTimeout(t); res(r); }, e => { clearTimeout(t); rej(e); }); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {   // the page: network first (to get a new version), the saved copy when there is no network
    e.respondWith(withTimeout(fetch(req), 4000).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (url.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {   // map, icons, fonts: saved copy first
    e.respondWith(caches.match(req, {ignoreSearch: url.origin === location.origin}).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
