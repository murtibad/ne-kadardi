// Game logic: question selection and scoring. Pure functions, no DOM access.

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

export function yearRange(questions) {
  const years = questions.map((q) => q.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}

export function filterByYears(questions, from, to) {
  return questions.filter((q) => q.year >= from && q.year <= to);
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


export function getHalfYear(dateStr) {
  if (!dateStr || dateStr.length < 4) return null;
  const year = dateStr.slice(0, 4);
  const month = dateStr.length >= 7 ? parseInt(dateStr.slice(5, 7), 10) : null;
  if (month === null) return null; // We need a month to determine half year reliably
  return `${year}-H${month <= 6 ? 1 : 2}`;
}

export function getShortUnit(unit) {
  if (!unit) return 'adet';
  const lower = unit.toLowerCase();
  if (lower.includes('litre')) return 'litre';
  if (lower.includes('gram') || lower.includes('gr')) return 'adet';
  if (lower.includes('usd')) return 'dolar';
  return 'adet';
}

export function buildContextLine(q, allQuestions) {
  if (q.productId === 'asgari-ucret') return null;
  const wages = allQuestions.filter(x => x.productId === 'asgari-ucret');
  if (wages.length === 0) return null;
  
  const qHalf = getHalfYear(q.date);
  if (!qHalf) return null;
  
  let pastWage = wages.find(x => getHalfYear(x.date) === qHalf);
  if (!pastWage) return null; // Must be same half-year

  const formatAmount = (wage, price, name) => {
    if (price <= wage) {
      const amount = Math.max(1, Math.floor(wage / price)); // Never 0
      return `1 asgari ücretle ${amount} ${getShortUnit(q.unit)}`;
    } else {
      const amount = (price / wage).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
      return `1 ${name || 'ürün'} = ${amount} asgari ücret`;
    }
  };

  let text = `O tarihte ${formatAmount(pastWage.price, q.price, q.name)}`;

  if (q.current) {
    const currentWageList = wages.filter(x => x.current);
    if (currentWageList.length > 0) {
      const currentWage = currentWageList[0].current.price;
      text += ` alınabiliyorken, bugün ${formatAmount(currentWage, q.current.price, q.name)} alınabiliyor.`;
    } else {
      text += ' alınabiliyordu.';
    }
  } else {
    text += ' alınabiliyordu.';
  }
  
  // Clean up wording
  text = text.replace('alınabiliyorken, bugün 1 ', 'alınabiliyorken, bugün ');
  if (q.price > pastWage.price) {
    text = text.replace('O tarihte 1', 'O tarihte bir').replace('alınabiliyordu.', 'ediyordu.');
    text = text.replace('alınabiliyorken, bugün', 'ederken, bugün');
  }
  return text;
}
