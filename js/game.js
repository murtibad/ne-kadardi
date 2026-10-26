// Game logic: question selection and scoring. Pure functions, no DOM access.
import { formatRatio, formatNumber } from './format.js';
import { categoryOf } from './categories.js';

const PERFECT_FACTOR = 1.1; // within 10% counts as a perfect guess
const ZERO_FACTOR = 5; // 5x off (either way) scores zero

export function yearOf(date) {
  return Number(date.slice(0, 4));
}

/** Flatten prices.json into playable questions. Only verified entries are playable. */
export function buildQuestions(data) {
  const questions = [];
  for (const product of data.products ?? []) {
    const current = product.current?.status === 'verified' ? product.current : null;
    for (const entry of product.prices ?? []) {
      if (entry.status !== 'verified' || !(entry.price > 0)) continue;
      questions.push({
        id: `${product.id}@${entry.date}`,
        productId: product.id,
        name: product.name,
        label: entry.label ?? null,
        unit: entry.unit ?? product.unit,
        region: product.region ?? null,
        image: entry.image ?? product.image ?? null,
        tax: product.tax ?? null,
        date: entry.date,
        year: yearOf(entry.date),
        price: entry.price,
        source: entry.source,
        current,
      });
    }
  }
  return questions;
}

/** Pick a random question, avoiding an immediate repeat when possible. */
export function pickRandom(questions, previousId = null, rng = Math.random) {
  const pool = questions.length > 1 ? questions.filter((q) => q.id !== previousId) : questions;
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Score a guess by ratio, not by difference, so every product is scored fairly.
 * The log scale makes "2x too high" and "2x too low" equally wrong.
 */
export function scoreGuess(guess, actual) {
  const ratio = guess / actual;
  const factor = Math.max(ratio, 1 / ratio);
  let direction = 'exact';
  if (factor > PERFECT_FACTOR) direction = ratio > 1 ? 'over' : 'under';

  let score = 100;
  if (factor > PERFECT_FACTOR) {
    const t = (Math.log(factor) - Math.log(PERFECT_FACTOR)) /
      (Math.log(ZERO_FACTOR) - Math.log(PERFECT_FACTOR));
    score = Math.round(100 * Math.max(0, 1 - t));
  }
  return { ratio, factor, direction, score };
}


// Colour tier of a result, from dark green (spot on) to dark red (way off).
// Thresholds on the 0-100 log score: 85 is roughly within 1.3x, 70 within 1.6x,
// 45 within 2.6x, 20 within 4x.
export function scoreTier(score) {
  if (score >= 85) return 'great';
  if (score >= 70) return 'good';
  if (score >= 45) return 'mid';
  if (score >= 20) return 'poor';
  return 'bad';
}

// Every question should feel like a new category: pick a product that was not shown recently
// (all products take turns), then a random year of that product. Products with many entries
// (e.g. 17 yearly values) therefore do not dominate. `recent` holds the latest product ids.
export function pickByCategory(questions, recent = [], previousId = null, rng = Math.random, seen = new Set()) {
  const products = [...new Set(questions.map((q) => q.productId))];
  let own = questions;
  if (products.length >= 2) {
    const keep = Math.min(products.length - 1, 8);
    const blocked = new Set(recent.slice(-keep));
    const fresh = products.filter((id) => !blocked.has(id));
    const productId = fresh[Math.floor(rng() * fresh.length)];
    own = questions.filter((q) => q.productId === productId);
  }
  // Prefer years the player has not answered yet; once all are seen, cycle through them again.
  const unseen = own.filter((q) => !seen.has(q.id) && q.id !== previousId);
  return pickRandom(unseen.length > 0 ? unseen : own, previousId, rng);
}

// "1 asgari ücretle 17 adet" leaves the reader asking "17 of what?", so every product is
// counted by a plain name. tests/game.test.js fails when a product in prices.json has none.
export const COUNT_UNITS = {
  'gram-altin': 'gram altın',
  dolar: 'dolar',
  euro: 'euro',
  sterlin: 'sterlin',
  benzin: 'litre benzin',
  motorin: 'litre motorin',
  otogaz: 'litre otogaz',
  'big-mac': 'Big Mac',
  'plastik-poset': 'poşet',
  ekmek: 'Halk Ekmek',
  cay: 'kilo çay',
  kopru: 'köprü geçişi',
  'ceyrek-altin': 'çeyrek altın',
  'gram-gumus': 'gram gümüş',
  bitcoin: 'Bitcoin',
  yks: 'YKS sınav ücreti',
  yds: 'YDS sınav ücreti',
  dgs: 'DGS sınav ücreti',
  msu: 'MSÜ sınav ücreti',
  'kpss-onlisans': 'KPSS önlisans sınav ücreti',
  'trafik-cezasi': 'kırmızı ışık cezası',
  'alkol-cezasi': 'alkollü araç cezası',
  fitre: 'kişilik fitre',
  'taksi-acilis': 'taksi açılışı',
  'ispark-otopark': 'saat otopark ücreti',
  'yht-bilet': 'hızlı tren bileti',
  iphone: 'iPhone',
  playstation: 'PlayStation',
  airpods: 'AirPods',
  'bedelli-askerlik': 'bedelli askerlik bedeli',
  'kpss-lisans': 'KPSS sınav ücreti',
  ales: 'ALES sınav ücreti',
  'osmangazi-koprusu': 'Osmangazi Köprüsü geçişi',
  'avrasya-tuneli': 'Avrasya Tüneli geçişi',
  'pasaport-harci': 'pasaport harcı',
  'ehliyet-harci': 'ehliyet harcı',
  'schengen-vize': 'Schengen vizesi',
  spotify: 'aylık Spotify aboneliği',
  'youtube-premium': 'aylık YouTube Premium üyeliği',
  'amazon-prime': 'aylık Amazon Prime üyeliği',
  'disney-plus': 'aylık Disney+ üyeliği',
  netflix: 'aylık Netflix aboneliği',
  'imei-kayit-harci': 'yurt dışı telefon kaydı',
  'istanbul-ulasim': 'otobüs/metro binişi',
  'kurban-vekalet-bedeli': 'kurban bedeli',
  'arac-muayene-ucreti': 'araç muayenesi',
  'sigara-marlboro': 'paket sigara',
  'aile-cuzdani': 'aile cüzdanı ücreti',
  'milli-piyango-ceyrek': 'çeyrek bilet',
  'surucu-belgesi-bedeli': 'ehliyet kartı ücreti',
  'arac-tescil-belgesi': 'ruhsat kartı ücreti',
  'kimlik-karti': 'kimlik kartı ücreti',
  'noter-asgari-ucret': 'noter işlemi',
  simit: 'simit',
  'mektup-pulu': 'mektup pulu',
  'sinema-ortalama-bilet': 'sinema bileti',
  'fiat-egea-easy': 'Fiat Egea',
  'togg-t10x': 'Togg T10X',
  'okul-servisi': 'aylık okul servisi',
  mtv: 'yıllık araba vergisi',
  'ehliyet-esinav': 'ehliyet yazılı sınavı ücreti',
  'kidem-tavani': 'kıdem tazminatı tavanı',
  'tmo-bugday': 'kilo buğday (devletin alım fiyatıyla)',
  'findik-alim': 'kilo kabuklu fındık (devletin alım fiyatıyla)',
  'cig-sut': 'litre çiğ süt (çiftçinin satış fiyatıyla)',
  'anadolu-otoyolu': 'tek yön İstanbul-Ankara otoyol geçişi',
  'iski-su': 'ton musluk suyu',
  'yurtdisi-cikis-harci': 'yurt dışı çıkış harcı',
  'basvurma-harci': 'dava harcı',
  'ea-fc-oyun': 'FIFA/EA FC oyunu',
  'kyk-yurt-ucreti': 'aylık yurt ücreti',
  'firin-ekmegi': 'fırın ekmeği',
};

// Fees, fines and tolls are paid, not bought: "3 ehliyet harcı ödenebiliyordu".
const PAID = new Set([
  'yks', 'ales', 'yds', 'dgs', 'msu', 'kpss-onlisans', 'osmangazi-koprusu', 'avrasya-tuneli', 'trafik-cezasi', 'alkol-cezasi', 'fitre', 'kopru', 'taksi-acilis', 'ispark-otopark', 'kpss-lisans', 'pasaport-harci', 'ehliyet-harci',
  'schengen-vize', 'imei-kayit-harci', 'istanbul-ulasim', 'kurban-vekalet-bedeli', 'arac-muayene-ucreti',
  'noter-asgari-ucret', 'yurtdisi-cikis-harci', 'basvurma-harci', 'bedelli-askerlik', 'kyk-yurt-ucreti',
  'spotify', 'netflix', 'youtube-premium', 'amazon-prime', 'disney-plus', 'iski-su', 'okul-servisi', 'mtv', 'ehliyet-esinav', 'anadolu-otoyolu', 'aile-cuzdani', 'surucu-belgesi-bedeli', 'arac-tescil-belgesi', 'kimlik-karti',
]);

// Money people receive (pensions, grants) or a cost-of-living line cannot be "bought" with a wage:
// "1 asgari ücretle 2 emekli aylığı" makes no sense. These compare as a share of the wage instead.
// `better` says which way is good news for the colour of the "Bugün" bar.
// `name` opens the sentence so the reader knows which amount the percentages are about.
export const WAGE_SHARE = {
  'emekli-en-dusuk-aylik': { better: 'higher', name: 'En düşük emekli aylığı' },
  'emekli-bayram-ikramiyesi': { better: 'higher', name: 'Bayram ikramiyesi' },
  'kyk-burs': { better: 'higher', name: 'KYK bursu' },
  'dogum-yardimi': { better: 'higher', name: 'Doğum yardımı' },
  'aclik-siniri': { better: 'lower', name: 'Açlık sınırı' },
};

/** Receipt label for the answer: a pension or a wage is an amount, not a price. */
// Money people receive or a legal limit, not something bought: the receipt says "Tutar".
const AMOUNTS = new Set(['asgari-ucret', 'kidem-tavani']);

// True for money people get or a limit (wage, pension, grant), not something they buy.
export function isAmount(productId) {
  return AMOUNTS.has(productId) || Boolean(WAGE_SHARE[productId]);
}

export function actualLabel(productId) {
  return isAmount(productId) ? 'Gerçek tutar' : 'Gerçek fiyat';
}

/** Count word for the purchasing-power line: the product's plain name, else the short unit. */
// Some fees read better as what they let you do: "13 kez YDS'ye girilebiliyordu",
// "303 saat park edilebiliyordu". `stem` takes -ebiliyordu / -ebiliyor / -emiyor.
const ACTIONS = {
  yks: { unit: 'kez', object: "YKS'ye", stem: 'giril' },
  ales: { unit: 'kez', object: "ALES'e", stem: 'giril' },
  'kpss-lisans': { unit: 'kez', object: "KPSS'ye", stem: 'giril' },
  yds: { unit: 'kez', object: "YDS'ye", stem: 'giril' },
  dgs: { unit: 'kez', object: "DGS'ye", stem: 'giril' },
  msu: { unit: 'kez', object: "MSÜ sınavına", stem: 'giril' },
  'kpss-onlisans': { unit: 'kez', object: "KPSS'ye", stem: 'giril' },
  'ispark-otopark': { unit: 'saat', object: '', stem: 'park edil' },
};

function actionLine(a, m, today) {
  const obj = a.object ? `${a.object} ` : '';
  if (today) return `Bugün 1 asgari ücretle ${count(m.then)} ${a.unit} ${obj}${a.stem}ebiliyor.`;
  const past = `O tarihte 1 asgari ücretle ${count(m.then)} ${a.unit} ${obj}${a.stem}ebiliyordu`;
  if (m.now == null) return `${past}.`;
  return m.now >= 1
    ? `${past}, bugün ${count(m.now)} ${a.unit} ${a.stem}ebiliyor.`
    : `${past}; bugün 1 asgari ücretle bir ${a.unit} bile ${a.stem}emiyor.`;
}

export function getCountUnit(q) {
  return COUNT_UNITS[q.productId] || getShortUnit(q.unit);
}

// Launch-price products change model over the years; name the model so "3 tane" is not vague.
function modelName(entry) {
  return entry?.label ? entry.label.replace(/^En yeni /, '') : null;
}

function count(n) {
  return formatNumber(n);
}

function percent(share) {
  return `%${formatNumber(Math.round(share * 100))}`;
}

// Turkish possessive after a number follows how its last word is read aloud: %49'u (dokuz),
// %84'ü (dört), %32'si (iki), %105'i (beş), %60'ı (altmış), %100'ü (yüz).
const ONES = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
const TENS = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
export function percentOf(share) {
  const n = Math.round(share * 100);
  let suffix;
  if (n === 0) suffix = 'ı';
  else if (n % 10) suffix = ONES[n % 10];
  else if (n % 100) suffix = TENS[(n % 100) / 10];
  else if (n % 1000) suffix = 'ü';
  else suffix = 'i';
  return `${percent(share)}'${suffix}`;
}

export function getShortUnit(unit) {
  if (!unit) return 'adet';
  const lower = unit.toLowerCase();
  if (lower.includes('litre')) return 'litre';
  // "1 adet, 250 gr" counts loaves, not grams: an explicit count unit wins over a weight note.
  if (/\badet\b/.test(lower)) return 'adet';
  if (/\b(gram|gr|g)\b/i.test(unit)) return 'gram';
  if (lower.includes('usd')) return 'dolar';
  return 'adet';
}

// The wage in force on a date: the latest raise of the same year on or before it. Every raise
// since 2010 is in prices.json (some years had only a January raise), so a gap means missing data
// and gives null. A year-only date is safe only when that year had a single raise.
function wageInForce(date, wages) {
  const year = date.slice(0, 4);
  const sameYear = wages.filter((x) => x.date.slice(0, 4) === year);
  if (date.length < 7) return sameYear.length === 1 ? sameYear[0] : null;
  return sameYear.filter((x) => x.date <= date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

/**
 * Purchasing-power line for the result receipt, based on the net minimum wage in force
 * on that date. Cheap items are counted ("102 adet"); items costing more than a wage
 * are expressed as wage multiples ("2,6 asgari ücret"), so the line never says "0 adet".
 */
export function buildContextLine(q, allQuestions) {
  const m = buildContextModel(q, allQuestions);
  if (!m) return null;

  const action = m.kind === 'count' ? ACTIONS[q.productId] : null;
  if (action) return actionLine(action, m, m.today);

  if (m.today) {
    if (m.kind === 'share') return `${m.name} bugün asgari ücretin ${percentOf(m.then)} kadar.`;
    if (m.kind === 'count') return `Bugün 1 asgari ücretle ${count(m.then)} ${m.unit} ${PAID.has(q.productId) ? 'ödenebiliyor' : 'alınabiliyor'}.`;
    return `Bugün bir ${m.name} ${formatRatio(m.then)} asgari ücret ediyor.`;
  }

  if (m.kind === 'share') {
    const past = `${m.name} o tarihte asgari ücretin ${percentOf(m.then)} kadardı`;
    return m.now == null ? `${past}.` : `${past}; bugün ${percentOf(m.now)}.`;
  }

  if (m.kind === 'count') {
    const paid = PAID.has(q.productId);
    const past = `O tarihte 1 asgari ücretle ${count(m.then)} ${m.unit} ${paid ? 'ödenebiliyordu' : 'alınabiliyordu'}`;
    if (m.now == null) return `${past}.`;
    return m.now >= 1
      ? `${past}, bugün ${count(m.now)} ${m.nowUnit} ${paid ? 'ödenebiliyor' : 'alınabiliyor'}.`
      : `${past}; bugün 1 asgari ücretle bir tane bile ${paid ? 'ödenemiyor' : 'alınamıyor'}.`;
  }

  const past = `O tarihte bir ${m.name} ${formatRatio(m.then)} asgari ücret ediyordu`;
  if (m.now == null) return `${past}.`;
  const nowName = m.nowName ? `${m.nowName} ise ` : '';
  return `${past}, bugün ${nowName}${formatRatio(m.now)} asgari ücret.`;
}

/**
 * The numbers behind buildContextLine, also used for the receipt bars.
 * kind 'share': the item as a share of the minimum wage (pensions, grants); `better` is 'higher' or 'lower'.
 * kind 'count': items per minimum wage, then/now (now 0 = one wage no longer buys one, null = no current price).
 * kind 'wages': cost in minimum wages, then/now (now null = no current price).
 */
export function buildContextModel(q, allQuestions) {
  if (q.productId === 'asgari-ucret') return null;
  const wages = allQuestions.filter((x) => x.productId === 'asgari-ucret');
  const pastWage = wageInForce(q.date, wages);
  if (!pastWage) return null;

  const currentWage = wages.find((x) => x.current)?.current.price;
  // The newest value is both a question and "today": comparing it with itself says nothing.
  const isToday = q.current && q.current.date === q.date && q.current.price === q.price;
  const hasNow = Boolean(q.current && currentWage && !isToday);
  // A question about today's price is told in the present, against today's wage.
  const today = Boolean(isToday && currentWage);
  const baseWage = today ? currentWage : pastWage.price;

  if (WAGE_SHARE[q.productId]) {
    return {
      kind: 'share',
      better: WAGE_SHARE[q.productId].better,
      name: WAGE_SHARE[q.productId].name,
      today,
      then: q.price / baseWage,
      now: hasNow ? q.current.price / currentWage : null,
    };
  }

  const thenModel = modelName(q);
  const nowModel = hasNow ? modelName(q.current) : null;
  // "1 asgari ücretle 1 ceza, bugün 1 ceza" hides a 1,6 → 1,1 change: near one wage, say the share.
  const fewThen = q.price <= baseWage && baseWage / q.price < 3;
  const fewNow = hasNow && q.current.price <= currentWage && currentWage / q.current.price < 3;
  // Equal small counts ("5 ceza, bugün 5 ceza") also hide the change behind rounding.
  const sameCount = hasNow && q.price <= baseWage && q.current.price <= currentWage
    && Math.floor(baseWage / q.price) === Math.floor(currentWage / q.current.price) && baseWage / q.price < 10;
  if (!thenModel && (fewThen || fewNow || sameCount)) {
    const word = COUNT_UNITS[q.productId];
    return {
      kind: 'share',
      better: 'lower',
      name: word ? word.charAt(0).toLocaleUpperCase('tr') + word.slice(1) : q.name,
      today,
      then: q.price / baseWage,
      now: hasNow ? q.current.price / currentWage : null,
    };
  }
  if (q.price <= baseWage) {
    const unit = getCountUnit(q);
    return {
      kind: 'count',
      today,
      unit: thenModel ? `tane ${thenModel}` : unit,
      nowUnit: nowModel ? `tane ${nowModel}` : unit,
      then: Math.floor(baseWage / q.price),
      now: hasNow ? Math.floor(currentWage / q.current.price) : null,
    };
  }
  return {
    kind: 'wages',
    name: thenModel || COUNT_UNITS[q.productId] || q.name,
    nowName: nowModel && nowModel !== thenModel ? nowModel : null,
    today,
    then: q.price / baseWage,
    now: hasNow ? q.current.price / currentWage : null,
  };
}

// A first-time player meets the most talked-about prices first, oldest year each, so the first
// few receipts land the "it was HOW much?" moment: bread, fuel, Big Mac, iPhone, dollar, Netflix.
// Benzin opens: a nationwide price most people land within 2x. Halk Ekmek (0,75 TL, an Istanbul
// subsidy) made the very first answer a likely 0 and moved to the middle.
export const OPENER_IDS = ['benzin', 'big-mac', 'dolar', 'ekmek', 'iphone', 'netflix'];

/** The opener for position `index` (oldest question of that product), or null when past the list or missing. */
export function openerFor(questions, index) {
  const id = OPENER_IDS[index];
  if (!id) return null;
  const own = questions.filter((q) => q.productId === id).sort((a, b) => a.date.localeCompare(b.date));
  return own[0] ?? null;
}

/** Everyday products for the result hook ("Peki 2016'da ... kaç liraydı?"). */
export const FOLLOW_UP_IDS = [
  'ekmek', 'simit', 'cay', 'big-mac', 'benzin', 'dolar', 'gram-altin', 'ceyrek-altin', 'iphone',
  'netflix', 'spotify', 'sigara-marlboro', 'taksi-acilis', 'istanbul-ulasim', 'kopru', 'asgari-ucret',
  'sinema-ortalama-bilet', 'playstation', 'mektup-pulu', 'pasaport-harci', 'fiat-egea-easy',
];

/**
 * Follow-up question from the same year as `q` for a different product, preferring
 * products not in `recentProducts` (last 8) and a different category when possible.
 */
export function pickFollowUp(q, questions, recentProducts = [], rng = Math.random) {
  if (!q || !Array.isArray(questions)) return null;
  const year = yearOf(q.date);
  const anyKnown = questions.filter((x) => x.productId !== q.productId && yearOf(x.date) === year);
  // A hook only tempts with something everyone has bought; obscure caps and fees fall back last.
  const known = anyKnown.filter((x) => FOLLOW_UP_IDS.includes(x.productId));
  const sameYear = known.length > 0 ? known : anyKnown;
  if (sameYear.length === 0) return null;
  const blocked = new Set(recentProducts.slice(-8));
  const fresh = sameYear.filter((x) => !blocked.has(x.productId));
  const pool = fresh.length > 0 ? fresh : sameYear;
  const qCat = categoryOf(q.productId);
  const otherCat = qCat ? pool.filter((x) => categoryOf(x.productId) !== qCat) : [];
  const chosenPool = otherCat.length > 0 ? otherCat : pool;
  return chosenPool[Math.floor(rng() * chosenPool.length)];
}

/** Pick a question in `categoryId` from another product (the archive already shows `excludeProductId`). */
export function pickFromCategory(questions, categoryId, excludeProductId, catOf = categoryOf, rng = Math.random) {
  if (!Array.isArray(questions) || !categoryId || typeof catOf !== 'function') return null;
  const pool = questions.filter((q) => q.productId !== excludeProductId && catOf(q.productId) === categoryId);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

const DAY_MS = 86_400_000;

function parseUtcDay(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function dayDiff(fromKey, toKey) {
  return Math.round((parseUtcDay(toKey) - parseUtcDay(fromKey)) / DAY_MS);
}

/** True when the player answered a question today or yesterday. */
export function streakAlive(prev, todayKey) {
  if (!prev?.last) return false;
  if (prev.count !== undefined && !(prev.count > 0)) return false;
  const diff = dayDiff(prev.last, todayKey);
  return diff === 0 || diff === 1;
}

/** Advance or reset the daily streak on an answered question for `todayKey` ('YYYY-MM-DD'). */
export function updateStreak(prev, todayKey) {
  const prevCount = Number.isFinite(prev?.count) && prev.count > 0 ? prev.count : 0;
  const prevBest = Number.isFinite(prev?.best) && prev.best > 0 ? prev.best : 0;
  const diff = prev?.last ? dayDiff(prev.last, todayKey) : NaN;
  if (diff === 0 && prevCount > 0) {
    return { last: todayKey, count: prevCount, best: Math.max(prevBest, prevCount) };
  }
  const count = diff === 1 ? prevCount + 1 : 1;
  return { last: todayKey, count, best: Math.max(prevBest, count) };
}
