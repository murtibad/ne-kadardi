// Service worker: makes the game installable and playable offline.
// Classic (non-module) script on purpose: module service workers are not supported
// everywhere yet, so the version is repeated here and tests/version.test.js checks it
// against package.json. A release bump therefore always changes this file, which makes
// browsers install the new worker, precache fresh files and drop the old cache.
const VERSION = '0.79.2';
const CACHE = `ne-kadardi-v${VERSION}`;
const FONT_CACHE = 'ne-kadardi-fonts';

// Paths are relative to this file, so the app works under the /ne-kadardi/ subpath.
// tests/precache.test.js checks that every file exists and no js/ module or image is missing.
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'data/prices.json',
  'js/banter.js',
  'js/cashier.js',
  'js/categories.js',
  'js/confetti.js',
  'js/count-up.js',
  'js/fact.js',
  'js/format.js',
  'js/game.js',
  'js/hint.js',
  'js/linkify.js',
  'js/main.js',
  'js/price-chart.js',
  'js/share-image.js',
  'js/share-model.js',
  'js/search.js',
  'js/sound.js',
  'js/source-kind.js',
  'js/tax.js',
  'js/timeline.js',
  'js/version.js',
  'sounds/beep.mp3',
  'sounds/bell.mp3',
  'sounds/print.mp3',
  'sounds/tear.mp3',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-512.png',
  'img/apple-touch-icon.png',
  'img/asgari-ucret.svg',
  'img/asker.svg',
  'img/benzin.svg',
  'img/biberon.svg',
  'img/big-mac.svg',
  'img/ceyrek-altin.svg',
  'img/dizi.svg',
  'img/dolar.svg',
  'img/aile-cuzdani.svg',
  'img/arac-tescil.svg',
  'img/egea.svg',
  'img/ehliyet.svg',
  'img/ekmek.svg',
  'img/emekli.svg',
  'img/euro.svg',
  'img/sterlin.svg',
  'img/fitre.svg',
  'img/gram-altin.svg',
  'img/imei.svg',
  'img/iphone-home.svg',
  'img/iphone-island.svg',
  'img/iphone-notch.svg',
  'img/kimlik-karti.svg',
  'img/kopru.svg',
  'img/milli-piyango.svg',
  'img/kulaklik.svg',
  'img/kurban.svg',
  'img/mezuniyet.svg',
  'img/motorin.svg',
  'img/muayene.svg',
  'img/muzik.svg',
  'img/noter.svg',
  'img/otobus.svg',
  'img/oyun-konsolu.svg',
  'img/pasaport.svg',
  'img/yurtdisi-cikis.svg',
  'img/basvurma-harci.svg',
  'img/plastik-poset.svg',
  'img/sepet.svg',
  'img/surucu-belgesi.svg',
  'img/sigara.svg',
  'img/simit.svg',
  'img/sinema.svg',
  'img/sinav.svg',
  'img/taksi.svg',
  'img/trafik-isigi.svg',
  'img/vize.svg',
  'img/otogaz.svg',
  'img/futbol-oyunu.svg',
  'img/gram-gumus.svg',
  'img/yurt.svg',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 'reload' skips the HTTP cache so a new version never precaches stale files.
    await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('ne-kadardi-') && key !== CACHE && key !== FONT_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event, CACHE));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    // Fonts are optional: if they are not cached yet, the request fails offline and
    // the CSS falls back to system fonts.
    event.respondWith(staleWhileRevalidate(event, FONT_CACHE));
  }
});

// Answer from the cache right away and refresh it in the background, so new prices
// and fixes reach players on their next visit without blocking this one.
async function staleWhileRevalidate(event, cacheName) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const isPage = req.mode === 'navigate';
  // Pages are cached as './' ; ignore ?query (e.g. share links) for them.
  const cached = await cache.match(req, { ignoreSearch: isPage })
    || (isPage ? await cache.match('./') : undefined);

  const network = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok || res.type === 'opaque') {
      const key = isPage ? './' : req;
      return cache.put(key, res.clone()).then(() => res);
    }
    return res;
  });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}
