// "Günün fişi": the same 5 questions for every player on a given day. Pure, no DOM.
import { scoreTier, cutoffKey, preferOlder, FOLLOW_UP_IDS } from './game.js';
import { formatPeriod, formatPrice } from './format.js';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

// Indexed by Date#getDay() (0 = Sunday).
const WEEKDAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const TIER_SQUARE = {
  great: '🟩',
  good: '🟩',
  mid: '🟨',
  poor: '🟧',
  bad: '🟥',
};

/** Local calendar date as 'YYYY-MM-DD' so midnight rolls over in the player's own time zone. */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates a saved daily run. Finished runs count only for `todayKey`; an unfinished run with
 * answers stays resumable for today and yesterday (a run that crossed midnight). If any saved id is
 * missing from `validIds` (data changed), ids and scores are emptied so the receipt is rebuilt
 * for the run's own key. Returns null when the run must be ignored.
 */
export function resolveSavedDaily(data, todayKey, validIds = null) {
  if (!data || typeof data.key !== 'string' || !Array.isArray(data.ids) || !Array.isArray(data.scores)) return null;
  const ids = data.ids.filter((x) => typeof x === 'string');
  // Scores without ids, or more scores than ids, are corrupt storage ("6/5", 580/500): drop the surplus.
  const scores = ids.length === 0 ? [] : data.scores.filter(Number.isFinite).slice(0, ids.length);
  // Guesses (number, or null for a skip) are kept only when they line up with the scores; older saves have none.
  const guessesOk = Array.isArray(data.guesses) && data.guesses.length === scores.length
    && data.guesses.every((g) => g === null || Number.isFinite(g));
  const finished = ids.length > 0 && scores.length >= ids.length;
  const resumable = !finished && scores.length > 0 && data.key === prevDayKey(todayKey);
  if (data.key !== todayKey && !resumable) return null;
  if (validIds && ids.some((id) => !validIds.has(id))) return { key: data.key, ids: [], scores: [] };
  return guessesOk ? { key: data.key, ids, scores, guesses: [...data.guesses] } : { key: data.key, ids, scores };
}

/** Deterministic PRNG seeded from a string key (FNV-1a hash feeding mulberry32). */
export function seededRng(key) {
  let h = 2166136261 >>> 0;
  const s = String(key);
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  let a = (h || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` deterministic questions for `key`: one random date per chosen product,
 * drawing from different categories before repeating a category.
 */
export function dailyQuestions(questions, key, categoryOf, count = 5) {
  if (!Array.isArray(questions) || questions.length === 0 || count <= 0) return [];
  // Sort by id first so the daily selection never depends on the input array order.
  const sorted = [...questions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const remaining = [...new Set(sorted.map((q) => q.productId))];
  const rng = seededRng(key);
  const usedCategories = new Set();
  const chosen = [];
  while (chosen.length < count && remaining.length > 0) {
    const freshCat = categoryOf ? remaining.filter((id) => !usedCategories.has(categoryOf(id))) : [];
    if (freshCat.length === 0) usedCategories.clear();
    const pool = freshCat.length > 0 ? freshCat : remaining;
    const productId = pool[Math.floor(rng() * pool.length)];
    remaining.splice(remaining.indexOf(productId), 1);
    if (categoryOf) usedCategories.add(categoryOf(productId));
    // Questions from the last 12 months before the day `key` are dull (today's price); the cutoff
    // comes from the key, never the clock, so every player gets the same receipt.
    const own = preferOlder(sorted.filter((q) => q.productId === productId), cutoffKey(key));
    chosen.push(own[Math.floor(rng() * own.length)]);
  }
  return chosen;
}

/**
 * Product ids in the "Günün Fişi" set for `key`, matching the everyday pool used by daily-ui.js.
 * Pass `everydayIds = null` to consider all `questions` without filtering.
 */
export function dailyProductIds(questions, key, categoryOf, everydayIds = FOLLOW_UP_IDS) {
  if (!Array.isArray(questions) || questions.length === 0) return new Set();
  const pool = everydayIds ? questions.filter((q) => everydayIds.includes(q.productId)) : questions;
  return new Set(dailyQuestions(pool, key, categoryOf).map((q) => q.productId));
}

function formatDay(key) {
  const [, m, d] = String(key).split('-');
  return `${Number(d)} ${MONTHS_TR[Number(m) - 1]}`;
}

/** Receipt heading for the daily card, e.g. 'GÜNÜN FİŞİ · 26 EKİM'. */
export function dailyTitle(key) {
  return `Günün fişi · ${formatDay(key)}`.toLocaleUpperCase('tr');
}

/** "Yeni fiş 7 saat sonra" until local midnight; under an hour it counts minutes. */
export function nextReceiptIn(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(1, Math.ceil((midnight - now) / 60000));
  return minutes >= 60 ? `Yeni fiş ${Math.floor(minutes / 60)} saat sonra` : `Yeni fiş ${minutes} dakika sonra`;
}

/** Spoiler-free share text: coloured squares and total score, no product names or prices. */
export function dailyShareText({ key, scores, url, streak = 0 }) {
  const list = scores ?? [];
  const squares = list.map((s) => TIER_SQUARE[scoreTier(s)] ?? '🟥').join('');
  const total = list.reduce((sum, s) => sum + s, 0);
  const lines = [
    `Ne Kadardı? 🧾 Günün fişi · ${formatDay(key)}`,
    `${squares} ${total}/500`,
  ];
  if (streak >= 2) lines.push(`🔥 ${streak} gün üst üste`);
  lines.push(`Sen kaç alırsın? ${url}`);
  return lines.join('\n');
}

/** Keep only the newest `max` days of the receipt log so storage stays tiny. Ignores bad entries. */
export function trimLog(log, max = 365) {
  const keys = Object.keys(log ?? {})
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(log[k]))
    .sort()
    .slice(-max);
  return Object.fromEntries(keys.map((k) => [k, log[k]]));
}

/** Previous local calendar day of a 'YYYY-MM-DD' key (noon avoids DST edge cases). */
export function prevDayKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12));
}

/** Menu/result numbers from the finished-receipt log: yesterday's total, best total, days played. */
export function dailyStats(log, todayKey) {
  const clean = trimLog(log, Infinity);
  const totals = Object.values(clean);
  const yesterday = clean[prevDayKey(todayKey)];
  return {
    yesterday: yesterday ?? null,
    best: totals.length ? Math.max(...totals) : null,
    played: totals.length,
  };
}

/** Menu line while today's receipt is not started, e.g. 'Dünkü fişin 331/500 · en iyin 412'. */
export function dailyMenuMeta(stats) {
  if (stats.yesterday === null) return '';
  const best = stats.best !== null && stats.best > stats.yesterday ? ` · en iyin ${stats.best}` : '';
  return `Dünkü fişin ${stats.yesterday}/500${best}`;
}

/** Result total line, with the change against yesterday when there is one. */
export function dailyTotalLine(total, yesterday) {
  const base = `Toplam: ${total}/500`;
  if (yesterday === null || yesterday === undefined) return base;
  const diff = total - yesterday;
  if (diff === 0) return `${base} · dünle aynı`;
  return `${base} · dünden ${diff > 0 ? '+' : '−'}${Math.abs(diff)}`;
}

/**
 * One receipt line for the daily review: label "Ocak 2016 · Benzin", detail "Sen ₺5 · Gerçek ₺4,28 · 86 puan".
 * `guess` is the player's number, null for a skip, undefined for an old save that never stored it
 * (then the detail is just "₺4,28 · 86 puan"). Parts are joined by " · " so the UI can keep each unbroken.
 * Guesses and prices live only here, never in the share text (a friend solves the same questions).
 */
export function dailyRowText({ date, title, price, score, guess }) {
  const label = `${formatPeriod(date)} · ${title}`;
  const hasPrice = Number.isFinite(price);
  if (guess === null) {
    return { label, detail: hasPrice ? `Geçtin · Gerçek ${formatPrice(price)}` : 'Geçtin' };
  }
  if (Number.isFinite(guess)) {
    const real = hasPrice ? ` · Gerçek ${formatPrice(price)}` : '';
    return { label, detail: `Sen ${formatPrice(guess)}${real} · ${score} puan` };
  }
  const priced = hasPrice ? `${formatPrice(price)} · ` : '';
  return { label, detail: `${priced}${score} puan` };
}

/** Review dialog total line; the streak is appended only when it is 2+ days and still alive. */
export function dailyReviewTotalLine(total, streak) {
  return `Toplam: ${total}/500${streak >= 2 ? ` · 🔥 ${streak} gün üst üste` : ''}`;
}

/**
 * Progress dots for a running Günün Fişi: answered questions carry their score tier,
 * the active question is marked 'current', and remaining ones are 'upcoming'.
 */
export function dailyProgressDots(scores, total = 5) {
  const count = Math.max(0, Math.floor(total));
  const answered = Array.isArray(scores) ? scores.filter(Number.isFinite) : [];
  return Array.from({ length: count }, (_, i) => {
    if (i < answered.length) {
      const score = answered[i];
      return { status: 'done', score, tier: scoreTier(score) };
    }
    return { status: i === answered.length ? 'current' : 'upcoming', score: null, tier: null };
  });
}

const DAILY_MILESTONES = {
  3: "3. Günün Fişi'n! Alışkanlık başlıyor.",
  7: "7. Günün Fişi'n! Tam bir haftalık fiş oldu.",
  10: "10. Günün Fişi'n! Bırakmadın.",
  25: "25. Günün Fişi'n! Artık müdavim oldun.",
  50: "50. Günün Fişi'n! Elli fiş oldu, helal olsun.",
  100: "100. Günün Fişi'n! Yüz fiş, büyük emek.",
};

/**
 * Warm celebration line for a finished Günün Fişi: new all-time daily best (never on the first
 * receipt ever) and/or a played-count milestone (3, 7, 10, 25, 50, 100). Returns '' otherwise.
 */
export function dailyMilestoneLine(stats, total, prevBest) {
  const played = stats?.played ?? 0;
  const parts = [];
  if (played >= 2 && Number.isFinite(prevBest) && Number.isFinite(total) && total > prevBest) {
    parts.push(prevBest > 0
      ? `Yeni rekor! Bugüne kadarki en iyi Günün Fişi'n. Önceki en iyin ${prevBest}.`
      : `Yeni rekor! Bugüne kadarki en iyi Günün Fişi'n.`);
  }
  const milestone = DAILY_MILESTONES[played];
  if (milestone) parts.push(milestone);
  return parts.join(' ');
}

/**
 * Model for the spoiler-free share image: tier per row and product names, but no prices
 * (a friend solves the same questions). `names` and `scores` are in question order.
 */
export function dailyImageModel({ key, names, scores, streak = 0 }) {
  const rows = (names ?? []).map((name, i) => {
    const raw = scores?.[i];
    const score = Number.isFinite(raw) ? raw : 0;
    return { name: String(name ?? ''), score, tier: scoreTier(score) };
  });
  const total = rows.reduce((s, r) => s + r.score, 0);
  return {
    title: dailyTitle(key),
    rows,
    total: `${total}/500`,
    streakLine: streak >= 2 ? `🔥 ${streak} gün` : null,
    siteAddress: 'murtibad.github.io/ne-kadardi',
  };
}

/** Cuts `text` with an ellipsis until `measure(text)` fits `maxWidth`; keeps at least one character. */
export function fitText(text, maxWidth, measure) {
  if (measure(text) <= maxWidth) return text;
  // "Asgari ücret (ele geçen, …)": dropping the bracketed detail reads better than cutting mid-word.
  const short = text.replace(/\s*\(.*$/, '');
  if (short && short !== text && measure(short) <= maxWidth) return short;
  let cut = short || text;
  while (cut.length > 1 && measure(`${cut.trimEnd()}…`) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Vertical layout of the daily image (px), so the canvas height follows from the row count. */
export function dailyImageLayout(rowCount, hasStreak) {
  const rowH = 96;
  const rowsTop = 360;
  const totalY = rowsTop + rowCount * rowH + 90;
  const streakY = totalY + 100;
  const bottom = hasStreak ? streakY + 60 : totalY + 40;
  return { rowH, rowsTop, totalY, streakY, height: bottom + 80 + 80 + 70 };
}

/**
 * The 7 local days ending on `todayKey` (oldest first) with their logged total or null.
 * Walks back with prevDayKey so month/year boundaries match how the log keys are written.
 */
export function lastSevenDays(log, todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayKey))) return [];
  const clean = trimLog(log, Infinity);
  const keys = [todayKey];
  while (keys.length < 7) keys.unshift(prevDayKey(keys[0]));
  return keys.map((key) => {
    const [y, m, d] = key.split('-').map(Number);
    // Noon, like prevDayKey, so the weekday never slips across a DST jump.
    const label = WEEKDAYS_TR[new Date(y, m - 1, d, 12).getDay()];
    return { key, label, total: clean[key] ?? null };
  });
}

/** The week strip is noise with a single day; show it from 2 played days on. */
export function weekStripVisible(days) {
  return Array.isArray(days) && days.filter((d) => d.total !== null).length >= 2;
}
