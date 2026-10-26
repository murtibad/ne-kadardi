// "Günün fişi": the same 5 questions for every player on a given day. Pure, no DOM.
import { scoreTier } from './game.js';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

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
    const own = sorted.filter((q) => q.productId === productId);
    chosen.push(own[Math.floor(rng() * own.length)]);
  }
  return chosen;
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
export function trimLog(log, max = 60) {
  const keys = Object.keys(log ?? {})
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(log[k]))
    .sort()
    .slice(-max);
  return Object.fromEntries(keys.map((k) => [k, log[k]]));
}

/** Previous local calendar day of a 'YYYY-MM-DD' key (noon avoids DST edge cases). */
function prevDayKey(key) {
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
