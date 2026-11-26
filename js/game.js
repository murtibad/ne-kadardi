// Game logic: question selection and scoring. Pure functions, no DOM access.
import { formatRatio, formatNumber, formatPrice, formatPeriod, ofPeriod } from './format.js';
import { categoryOf, familyOf } from './categories.js';

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
        explain: product.explain ?? null,
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

// Free play: a product is not shown again within RECENT_WINDOW questions, no product family
// repeats within FAMILY_WINDOW questions, and no category fills more than CATEGORY_CAP of the
// last CATEGORY_WINDOW questions (each soft: falls back when filtering would empty the pool).
export const RECENT_WINDOW = 15;
export const FAMILY_WINDOW = 8;
export const CATEGORY_WINDOW = 10;
export const CATEGORY_CAP = 3;
export const RECENT_MONTHS = 12;

/** 'YYYY-MM-DD' of `months` months before the day `from` ('YYYY-MM-DD' or a Date). */
export function cutoffKey(from = new Date(), months = RECENT_MONTHS) {
  let y; let m; let d;
  if (typeof from === 'string') [y, m, d] = from.split('-').map(Number);
  else { y = from.getFullYear(); m = from.getMonth() + 1; d = from.getDate(); }
  const total = y * 12 + (m - 1) - months;
  const pad = (n) => String(n).padStart(2, '0');
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-${pad(d || 1)}`;
}

/** Drop questions dated after `cutoff` ('YYYY-MM-DD') when older ones exist; otherwise keep all. */
export function preferOlder(own, cutoff) {
  const older = own.filter((q) => q.date < cutoff);
  return older.length > 0 ? older : own;
}

// Every question should feel like a new category: pick a product that was not shown recently
// (all products take turns), then a random year of that product. Products with many entries
// (e.g. 17 yearly values) therefore do not dominate. `recent` holds the latest product ids;
// `excludeProducts` (optional Set/iterable) softly skips products reserved for e.g. today's Günün Fişi.
export function pickByCategory(
  questions,
  recent = [],
  previousId = null,
  rng = Math.random,
  seen = new Set(),
  today = new Date(),
  excludeProducts = null,
) {
  const products = [...new Set(questions.map((q) => q.productId))];
  const cutoff = cutoffKey(today);
  let own = questions;
  if (products.length >= 2) {
    let pool = products;
    const excluded = excludeProducts ? (excludeProducts instanceof Set ? excludeProducts : new Set(excludeProducts)) : null;
    if (excluded && excluded.size > 0) {
      const allowed = pool.filter((id) => !excluded.has(id));
      if (allowed.length > 0) pool = allowed;
    }
    if (pool.length >= 2) {
      const keep = Math.min(pool.length - 1, RECENT_WINDOW);
      const blocked = new Set(recent.slice(-keep));
      const notRecent = pool.filter((id) => !blocked.has(id));
      if (notRecent.length > 0) pool = notRecent;
    }
    // Soft category cap over the latest questions.
    const counts = {};
    for (const id of recent.slice(-CATEGORY_WINDOW)) {
      const c = categoryOf(id);
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    const capped = pool.filter((id) => (counts[categoryOf(id)] ?? 0) < CATEGORY_CAP);
    if (capped.length > 0) pool = capped;
    // Soft product-family cooldown over the last FAMILY_WINDOW questions (e.g. bread, fuel, exams).
    const recentFamilies = new Set(recent.slice(-FAMILY_WINDOW).map(familyOf).filter(Boolean));
    if (recentFamilies.size > 0) {
      const freshFamily = pool.filter((id) => !recentFamilies.has(familyOf(id)));
      if (freshFamily.length > 0) pool = freshFamily;
    }
    const productId = pool[Math.floor(rng() * pool.length)];
    own = questions.filter((q) => q.productId === productId);
  }
  own = preferOlder(own, cutoff);
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
  'istanbul-ogrenci-bileti': 'öğrenci binişi',
  'ankara-ulasim': 'otobüs/metro binişi',
  'izmir-ulasim': 'otobüs/metro binişi',
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
  'yemek-karti': 'günlük yemek bedeli',
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
  'schengen-vize', 'imei-kayit-harci', 'istanbul-ulasim', 'istanbul-ogrenci-bileti', 'ankara-ulasim', 'izmir-ulasim', 'kurban-vekalet-bedeli', 'arac-muayene-ucreti',
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
  'yemek-karti': { better: 'higher', name: 'Yemek kartının günlük vergisiz tutarı' },
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

// Below 10% whole numbers hide real changes ("%1'i kadardı; bugün %1'i"), so keep one decimal there.
function percentValue(share) {
  return share < 0.1 ? Math.round(share * 1000) / 10 : Math.round(share * 100);
}

function percent(share) {
  return `%${formatNumber(percentValue(share), { maximumFractionDigits: 1 })}`;
}

// Turkish possessive after a number follows how its last word is read aloud: %49'u (dokuz),
// %84'ü (dört), %32'si (iki), %105'i (beş), %60'ı (altmış), %100'ü (yüz).
const ONES = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
const TENS = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
export function percentOf(share) {
  const v = percentValue(share);
  // "%1,4" is read "bir virgül dört": the decimal digit decides the ending.
  const n = Number.isInteger(v) ? v : Math.round(v * 10) % 10;
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

// What one minimum wage bought, in things most people know the price of. Order is preference:
// the first two that have sourced prices on the wage's date are used.
export const WAGE_BASKET_IDS = ['gram-altin', 'benzin', 'ekmek', 'dolar'];

// Only real, sourced numbers: a todo row (price null) or a non-verified row never enters the line.
function isVerified(x) {
  return Boolean(x) && Number.isFinite(x.price) && x.price > 0 && (x.status == null || x.status === 'verified');
}

// The item's price on a wage date: a verified row of the same month (a July wage divided by a
// January gold price would overstate what it bought). A year-only wage date matches year-only rows.
function itemPriceInForce(rows, date) {
  const key = date.length < 7 ? date.slice(0, 4) : date.slice(0, 7);
  return rows
    .filter((x) => isVerified(x) && (date.length < 7 ? x.date === key : x.date.slice(0, 7) === key))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
}

// Under 10 the decimal matters ("7,4 gram altın"); above it whole units read easier.
// Rounded down so the line never promises more than the wage really bought.
function basketAmount(wage, price) {
  const n = wage / price;
  return n < 10 ? Math.floor((wage * 10) / price) / 10 : Math.floor(n);
}

/**
 * Receipt line for a minimum wage question: what one wage bought then and buys today,
 * e.g. "O tarihte 1 asgari ücretle 7,4 gram altın ya da 158 litre benzin alınabiliyordu; bugün ...".
 * Returns null when no basket item has a verified price on that date and a current price.
 */
export function buildWageBasketLine(q, allQuestions) {
  if (q.productId !== 'asgari-ucret' || !isVerified(q)) return null;
  const nowWage = isVerified(q.current) ? q.current.price : null;
  // The newest wage is also "today": saying "then X, today X" would say nothing.
  const today = Boolean(nowWage && q.current.date === q.date && q.current.price === q.price);

  const items = [];
  for (const id of WAGE_BASKET_IDS) {
    if (!COUNT_UNITS[id]) continue;
    const rows = allQuestions.filter((x) => x.productId === id);
    const then = today ? null : itemPriceInForce(rows, q.date);
    const now = rows.find((x) => x.current)?.current;
    if (!today && !then) continue;
    if (nowWage && !isVerified(now)) continue;
    const thenAmount = then ? basketAmount(q.price, then.price) : null;
    const nowAmount = nowWage ? basketAmount(nowWage, now.price) : null;
    // "0 gram altın" reads like an error; skip the item instead.
    if (thenAmount === 0 || nowAmount === 0) continue;
    items.push({ unit: COUNT_UNITS[id], thenAmount, nowAmount });
    if (items.length === 2) break;
  }
  if (items.length === 0) return null;

  const list = (key) => items
    .map((it) => `${formatNumber(it[key], { maximumFractionDigits: 1 })} ${it.unit}`)
    .join(' ya da ');
  if (today) return `Bugün 1 asgari ücretle ${list('nowAmount')} alınabiliyor.`;
  const past = `O tarihte 1 asgari ücretle ${list('thenAmount')} alınabiliyordu`;
  return nowWage ? `${past}; bugün ${list('nowAmount')}.` : `${past}.`;
}

/**
 * Purchasing-power line for the result receipt, based on the net minimum wage in force
 * on that date. Cheap items are counted ("102 adet"); items costing more than a wage
 * are expressed as wage multiples ("2,6 asgari ücret"), so the line never says "0 adet".
 */
export function buildContextLine(q, allQuestions) {
  // The wage itself gets a basket line; buildContextModel stays null for it so no receipt bars show.
  if (q.productId === 'asgari-ucret') return buildWageBasketLine(q, allQuestions);
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
 * Follow-up question from the same year as `q` for a different product. Prefers everyday
 * products (FOLLOW_UP_IDS) not among the last 8 of `recentProducts`, then a different category;
 * never the product offered last time (`lastFollowId`). When every candidate is recent, the one
 * answered longest ago wins.
 */
export function pickFollowUp(q, questions, recentProducts = [], rng = Math.random, lastFollowId = null) {
  if (!q || !Array.isArray(questions)) return null;
  const year = yearOf(q.date);
  let anyKnown = questions.filter((x) => x.productId !== q.productId && yearOf(x.date) === year);
  if (anyKnown.some((x) => x.productId !== lastFollowId)) anyKnown = anyKnown.filter((x) => x.productId !== lastFollowId);
  if (anyKnown.length === 0) return null;
  // A hook only tempts with something everyone has bought; obscure caps and fees fall back last.
  const known = anyKnown.filter((x) => FOLLOW_UP_IDS.includes(x.productId));
  const sameYear = known.length > 0 ? known : anyKnown;
  const blocked = new Set(recentProducts.slice(-8));
  const fresh = sameYear.filter((x) => !blocked.has(x.productId));
  let pool = fresh.length > 0 ? fresh : sameYear;
  const qCat = categoryOf(q.productId);
  const otherCat = qCat ? pool.filter((x) => categoryOf(x.productId) !== qCat) : [];
  if (otherCat.length > 0) pool = otherCat;
  if (fresh.length === 0) {
    // All recent: keep only the products answered longest ago.
    const age = (x) => recentProducts.lastIndexOf(x.productId);
    const oldest = Math.min(...pool.map(age));
    pool = pool.filter((x) => age(x) === oldest);
  }
  // Choose the product first so a product with several entries that year is not favoured.
  const ids = [...new Set(pool.map((x) => x.productId))];
  const id = ids[Math.floor(rng() * ids.length)];
  const own = pool.filter((x) => x.productId === id);
  return own[Math.floor(rng() * own.length)];
}

/** Pick a question in `categoryId` from another product (the archive already shows `excludeProductId`). */
export function pickFromCategory(questions, categoryId, excludeProductId, catOf = categoryOf, rng = Math.random) {
  if (!Array.isArray(questions) || !categoryId || typeof catOf !== 'function') return null;
  const pool = questions.filter((q) => q.productId !== excludeProductId && catOf(q.productId) === categoryId);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

const DAY_MS = 86_400_000;
const RETURN_GREETING_DAYS = 5;

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
  // Negative: the clock moved back (travel west); the streak is not broken by that.
  return diff <= 1;
}

/** True when `todayKey` is a new day for the streak; a clock moved back is not a first answer. */
export function isFirstAnswerOfDay(prev, todayKey) {
  return !prev?.last || prev.last < todayKey;
}

/** Advance or reset the daily streak on an answered question for `todayKey` ('YYYY-MM-DD'). */
export function updateStreak(prev, todayKey) {
  const prevCount = Number.isFinite(prev?.count) && prev.count > 0 ? prev.count : 0;
  const prevBest = Number.isFinite(prev?.best) && prev.best > 0 ? prev.best : 0;
  const diff = prev?.last ? dayDiff(prev.last, todayKey) : NaN;
  if (diff <= 0 && prevCount > 0) {
    // Same day, or the clock moved back: keep the count and the later date so tomorrow still extends it.
    return { last: diff < 0 ? prev.last : todayKey, count: prevCount, best: Math.max(prevBest, prevCount) };
  }
  const count = diff === 1 ? prevCount + 1 : 1;
  return { last: todayKey, count, best: Math.max(prevBest, count) };
}

/**
 * Home menu streak line for `todayKey` ('YYYY-MM-DD').
 * After 5+ days away, greets returning players warmly instead of scolding a broken streak.
 */
export function homeStreakText(prev, todayKey) {
  if (!prev?.last) return '';
  const diff = dayDiff(prev.last, todayKey);
  if (!Number.isFinite(diff)) return '';
  const count = Number.isFinite(prev.count) && prev.count > 0 ? prev.count : 0;
  const best = Math.max(Number.isFinite(prev.best) && prev.best > 0 ? prev.best : 0, count);
  if (diff >= RETURN_GREETING_DAYS) {
    return best >= 2
      ? `Yeniden hoş geldin! En uzun serin ${best} gündü; bugün yeni bir seri başlat.`
      : 'Yeniden hoş geldin! Bugün yeni bir seri başlat.';
  }
  const alive = streakAlive(prev, todayKey) && count >= 2;
  if (alive && prev.last !== todayKey) return 'Serini koru: bugün bir soru çöz.';
  if (!streakAlive(prev, todayKey) && count >= 2) {
    return `Serin bozuldu (en uzun: ${best} gün). Bugün yeniden başla.`;
  }
  return '';
}

/**
 * Decide whether a new score should replace the stored best guess.
 * Replaces when nothing valid is stored (even for a 0 score) or when `score` beats `prev.score`.
 */
export function shouldReplaceBestGuess(prev, score) {
  if (!Number.isFinite(score) || score < 0) return false;
  if (!prev || typeof prev !== 'object' || !Number.isFinite(prev.score) || prev.score < 0) return true;
  return score > prev.score;
}

/**
 * Validate a stored `{ productId, date, score }` record against playable `questions`.
 * Returns `{ question, score }` or null when absent, malformed, or no longer in `questions`.
 */
export function resolveBestGuess(saved, questions) {
  if (!saved || typeof saved !== 'object') return null;
  if (typeof saved.productId !== 'string' || !saved.productId) return null;
  if (typeof saved.date !== 'string' || !saved.date) return null;
  if (!Number.isFinite(saved.score) || saved.score < 0) return null;
  if (!Array.isArray(questions) || questions.length === 0) return null;
  const question = questions.find((q) => q.productId === saved.productId && q.date === saved.date) ?? null;
  if (!question) return null;
  return { question, score: saved.score };
}

export const TIME_WARP_MIN_FACTOR = 1.4; // only show the time-warp line when off by 40%+
const TIME_WARP_MATCH_FACTOR = 1.2; // within ±20% in ratio terms

function isVerifiedPrice(row) {
  return Boolean(
    row
    && (row.status === undefined || row.status === 'verified')
    && Number.isFinite(row.price) && row.price > 0
  );
}

/**
 * Find the closest verified price row of the same product (including `current`) to `guess`
 * in ratio terms, within ±20% (factor <= 1.2), excluding `askedDate`. Falls back to
 * `{ kind: 'above-current' }` when `guess` exceeds `current.price` by more than 20%.
 * Never interpolates or invents prices.
 */
export function matchGuessedPeriod(guess, productRows, askedDate, current = null) {
  if (!Number.isFinite(guess) || guess <= 0) return null;
  const rows = Array.isArray(productRows) ? productRows : [];
  const validCurrent = isVerifiedPrice(current) && (!current.date || current.date !== askedDate) ? current : null;

  let best = null;
  if (validCurrent) {
    const factor = Math.max(guess / validCurrent.price, validCurrent.price / guess);
    if (factor <= TIME_WARP_MATCH_FACTOR) {
      best = { kind: 'current', date: validCurrent.date ?? null, price: validCurrent.price, factor };
    }
  }

  for (const row of rows) {
    if (!isVerifiedPrice(row) || typeof row.date !== 'string' || !row.date) continue;
    if (row.date === askedDate) continue;
    if (validCurrent && validCurrent.date && row.date === validCurrent.date) continue;
    const factor = Math.max(guess / row.price, row.price / guess);
    if (factor > TIME_WARP_MATCH_FACTOR) continue;
    if (!best || factor < best.factor || (factor === best.factor && best.kind !== 'current' && row.date > best.date)) {
      best = { kind: 'period', date: row.date, price: row.price, factor };
    }
  }

  if (best) return best;
  if (validCurrent && guess / validCurrent.price > TIME_WARP_MATCH_FACTOR) {
    return { kind: 'above-current', date: validCurrent.date ?? null, price: validCurrent.price, factor: guess / validCurrent.price };
  }
  return null;
}

/** Format a matchGuessedPeriod result into one plain-Turkish receipt line, or '' when absent. */
export function timeWarpText(guess, match, { amount = false } = {}) {
  if (!match || !Number.isFinite(guess) || guess <= 0) return '';
  if (match.kind === 'period') {
    const when = ofPeriod(formatPeriod(match.date));
    // Within 5% reads as the same price; otherwise say "close to" and show the real one.
    if (match.factor <= 1.05) return `Yazdığın ${formatPrice(guess)} aslında ${when} ${amount ? 'tutarıydı' : 'fiyatıydı'}.`;
    return `Yazdığın ${formatPrice(guess)}, ${when} ${amount ? 'tutarına' : 'fiyatına'} yakın (${formatPrice(match.price)}).`;
  }
  if (match.kind === 'current') {
    return amount ? 'Yazdığın tutar, bugünkü tutara yakın.' : 'Yazdığın fiyat, bugünkü fiyata yakın.';
  }
  if (match.kind === 'above-current') {
    return amount ? 'Yazdığın tutar bugünkünden bile yüksek!' : 'Yazdığın fiyat bugünkünden bile yüksek!';
  }
  return '';
}
