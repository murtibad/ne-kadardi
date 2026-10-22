// Game logic: question selection and scoring. Pure functions, no DOM access.
import { formatRatio } from './format.js';

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
export function pickByCategory(questions, recent = [], previousId = null, rng = Math.random) {
  const products = [...new Set(questions.map((q) => q.productId))];
  if (products.length < 2) return pickRandom(questions, previousId, rng);
  const keep = Math.min(products.length - 1, 8);
  const blocked = new Set(recent.slice(-keep));
  const fresh = products.filter((id) => !blocked.has(id));
  const productId = fresh[Math.floor(rng() * fresh.length)];
  return pickRandom(questions.filter((q) => q.productId === productId), previousId, rng);
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
  yks: 'YKS sınav ücreti',
  'trafik-cezasi': 'kırmızı ışık cezası',
  fitre: 'kişilik fitre',
  'taksi-acilis': 'taksi açılışı',
  iphone: 'iPhone',
  playstation: 'PlayStation',
  airpods: 'AirPods',
  'bedelli-askerlik': 'bedelli askerlik bedeli',
  'kpss-lisans': 'KPSS sınav ücreti',
  'pasaport-harci': 'pasaport harcı',
  'ehliyet-harci': 'ehliyet harcı',
  'schengen-vize': 'Schengen vizesi',
  spotify: 'aylık Spotify aboneliği',
  netflix: 'aylık Netflix aboneliği',
  'imei-kayit-harci': 'yurt dışı telefon kaydı',
  'istanbul-ulasim': 'otobüs/metro binişi',
  'kurban-vekalet-bedeli': 'kurban bedeli',
  'arac-muayene-ucreti': 'araç muayenesi',
  'sigara-marlboro': 'paket sigara',
  'aile-cuzdani': 'aile cüzdanı',
  'milli-piyango-ceyrek': 'çeyrek bilet',
  'surucu-belgesi-bedeli': 'ehliyet kartı',
  'arac-tescil-belgesi': 'araç ruhsatı',
  'kimlik-karti': 'kimlik kartı',
  'noter-asgari-ucret': 'noter işlemi',
  simit: 'simit',
  'sinema-ortalama-bilet': 'sinema bileti',
  'fiat-egea-easy': 'Fiat Egea',
  'yurtdisi-cikis-harci': 'yurt dışı çıkış harcı',
  'basvurma-harci': 'dava harcı',
  'ea-fc-oyun': 'FIFA/EA FC oyunu',
  'kyk-yurt-ucreti': 'aylık yurt ücreti',
  'firin-ekmegi': 'fırın ekmeği',
};

// Fees, fines and tolls are paid, not bought: "3 ehliyet harcı ödenebiliyordu".
const PAID = new Set([
  'yks', 'trafik-cezasi', 'fitre', 'kopru', 'taksi-acilis', 'kpss-lisans', 'pasaport-harci', 'ehliyet-harci',
  'schengen-vize', 'imei-kayit-harci', 'istanbul-ulasim', 'kurban-vekalet-bedeli', 'arac-muayene-ucreti',
  'noter-asgari-ucret', 'yurtdisi-cikis-harci', 'basvurma-harci', 'bedelli-askerlik', 'kyk-yurt-ucreti',
  'spotify', 'netflix', 'aile-cuzdani', 'surucu-belgesi-bedeli', 'arac-tescil-belgesi', 'kimlik-karti',
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

/** Count word for the purchasing-power line: the product's plain name, else the short unit. */
export function getCountUnit(q) {
  return COUNT_UNITS[q.productId] || getShortUnit(q.unit);
}

// Launch-price products change model over the years; name the model so "3 tane" is not vague.
function modelName(entry) {
  return entry?.label ? entry.label.replace(/^En yeni /, '') : null;
}

function count(n) {
  return n.toLocaleString('tr-TR');
}

function percent(share) {
  return `%${Math.round(share * 100).toLocaleString('tr-TR')}`;
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
  const hasNow = Boolean(q.current && currentWage);

  if (WAGE_SHARE[q.productId]) {
    return {
      kind: 'share',
      better: WAGE_SHARE[q.productId].better,
      name: WAGE_SHARE[q.productId].name,
      then: q.price / pastWage.price,
      now: hasNow ? q.current.price / currentWage : null,
    };
  }

  const thenModel = modelName(q);
  const nowModel = hasNow ? modelName(q.current) : null;
  if (q.price <= pastWage.price) {
    const unit = getCountUnit(q);
    return {
      kind: 'count',
      unit: thenModel ? `tane ${thenModel}` : unit,
      nowUnit: nowModel ? `tane ${nowModel}` : unit,
      then: Math.floor(pastWage.price / q.price),
      now: hasNow ? Math.floor(currentWage / q.current.price) : null,
    };
  }
  return {
    kind: 'wages',
    name: thenModel || COUNT_UNITS[q.productId] || q.name,
    nowName: nowModel && nowModel !== thenModel ? nowModel : null,
    then: q.price / pastWage.price,
    now: hasNow ? q.current.price / currentWage : null,
  };
}
