// "Hangi Yıl?" mode: one product and price, pick its year from four. Pure, no DOM.
export const OPTION_COUNT = 4;
// A distractor this close in price would be just as right as the answer (flat fees, slow years).
export const MIN_PRICE_GAP = 1.08;

function ratio(a, b) {
  return Math.max(a, b) / Math.min(a, b);
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** productId -> Map(year -> first question of that year, in input order). */
function yearsByProduct(questions) {
  const out = new Map();
  for (const q of questions) {
    if (!out.has(q.productId)) out.set(q.productId, new Map());
    const years = out.get(q.productId);
    if (!years.has(q.year)) years.set(q.year, q);
  }
  return out;
}

function distractorYears(answer, years) {
  return [...years.values()]
    .filter((q) => q.year !== answer.year && ratio(q.price, answer.price) >= MIN_PRICE_GAP)
    .map((q) => q.year);
}

/**
 * Returns { question, options } with `options` the answer year plus three years of the same
 * product whose prices clearly differ, sorted ascending; null when no product qualifies.
 */
export function pickYearRound(questions, rng = Math.random, recentIds = []) {
  const byProduct = yearsByProduct(questions);
  const fits = (q) => distractorYears(q, byProduct.get(q.productId)).length >= OPTION_COUNT - 1;
  const recent = new Set(recentIds);
  const fresh = questions.filter((q) => !recent.has(q.id));
  for (const pool of [fresh, questions]) {
    if (pool.length === 0) continue;
    let answer = null;
    for (let i = 0; i < 200 && !answer; i++) {
      const q = pool[Math.floor(rng() * pool.length)];
      if (fits(q)) answer = q;
    }
    answer ??= pool.find(fits);
    if (!answer) continue;
    const others = shuffle(distractorYears(answer, byProduct.get(answer.productId)), rng).slice(0, OPTION_COUNT - 1);
    return { question: answer, options: [answer.year, ...others].sort((a, b) => a - b) };
  }
  return null;
}

export function judgeYear(round, year) {
  const answer = round.question.year;
  return { correct: year === answer, answer, off: Math.abs(year - answer) };
}
