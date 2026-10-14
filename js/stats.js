// Pure stats model: turns raw localStorage strings into receipt rows. No DOM, no storage access.
export const STAT_KEYS = [
  'ne-kadardi-session',
  'ne-kadardi-versus-best',
  'ne-kadardi-order-stats',
  'ne-kadardi-blitz-best',
  'ne-kadardi-yearguess-best',
  'ne-kadardi-basket-best',
];

const NOT_PLAYED = ['Henüz oynanmadı'];

function json(str) {
  try {
    const v = JSON.parse(str);
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    return null;
  }
}

// Positive finite number or 0; garbage and negatives count as "not played".
function positive(value) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

function bestRow(mode, href, str, label, suffix = '') {
  const n = positive(str);
  return { mode, href, lines: n ? [`${label} ${n}${suffix}`] : NOT_PLAYED };
}

export function buildStats(raw) {
  const r = raw || {};
  const session = json(r['ne-kadardi-session']);
  const played = positive(session?.played);
  const total = Number.isFinite(session?.total) ? session.total : 0;
  const best = positive(session?.best);
  const guess = { mode: 'Fiyat Tahmini', href: '#tahmin', lines: NOT_PLAYED };
  if (played) {
    guess.lines = [`${played} soru`, `ortalama ${Math.round(total / played)}`];
    if (best) guess.lines.push(`en iyi ${best}`);
  }

  const order = json(r['ne-kadardi-order-stats']);
  const rounds = positive(order?.rounds);
  const sort = { mode: 'Sırala', href: '#sirala', lines: NOT_PLAYED };
  if (rounds) {
    const orderTotal = Number.isFinite(order.total) ? order.total : 0;
    sort.lines = [`${rounds} set`, `ortalama ${Math.round(orderTotal / rounds)}`, `${positive(order.perfect)} kusursuz`];
  }

  return [
    guess,
    bestRow('Hangisi Pahalı?', '#hangisi', r['ne-kadardi-versus-best'], 'en iyi seri'),
    sort,
    bestRow('60 Saniye', '#60-saniye', r['ne-kadardi-blitz-best'], 'en iyi', ' doğru'),
    bestRow('Hangi Yıl?', '#hangi-yil', r['ne-kadardi-yearguess-best'], 'en iyi seri'),
    bestRow('Sepet Kurma', '#sepet', r['ne-kadardi-basket-best'], 'en iyi puan'),
  ];
}
