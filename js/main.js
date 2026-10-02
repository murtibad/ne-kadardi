// UI wiring: loads data, renders screens, handles input. Logic lives in game.js and format.js.
import { parseGuess, formatPrice, formatRatio, formatPeriod } from './format.js';
import { buildQuestions, yearRange, filterByYears, pickRandom, scoreGuess } from './game.js';

const DATA_URL = 'data/prices.json';
const $ = (id) => document.getElementById(id);

const state = { all: [], pool: [], question: null, result: null, played: 0, total: 0 };

function show(screenId) {
  for (const id of ['message-screen', 'question-screen', 'result-screen']) {
    $(id).hidden = id !== screenId;
  }
}

function showMessage(text) {
  $('message-text').textContent = text;
  show('message-screen');
}

function setupYearFilter() {
  const { min, max } = yearRange(state.all);
  for (const select of [$('year-from'), $('year-to')]) {
    for (let y = min; y <= max; y++) select.add(new Option(String(y), String(y)));
  }
  $('year-from').value = String(min);
  $('year-to').value = String(max);
  $('year-from').addEventListener('change', onFilterChange);
  $('year-to').addEventListener('change', onFilterChange);
}

function onFilterChange() {
  let from = Number($('year-from').value);
  let to = Number($('year-to').value);
  if (from > to) [from, to] = [to, from];
  state.pool = filterByYears(state.all, from, to);
  nextQuestion();
}

function questionTitle(q) {
  return q.label ? `${q.name} (${q.label})` : q.name;
}

function nextQuestion() {
  const q = pickRandom(state.pool, state.question?.id);
  if (!q) {
    showMessage('Bu yıl aralığında soru yok. Aralığı genişlet.');
    return;
  }
  state.question = q;
  $('q-period').textContent = formatPeriod(q.date);
  $('q-name').textContent = questionTitle(q);
  $('q-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('guess-input').value = '';
  $('guess-error').textContent = '';
  show('question-screen');
  $('guess-input').focus();
}

function onGuess(event) {
  event.preventDefault();
  const guess = parseGuess($('guess-input').value);
  if (guess === null) {
    $('guess-error').textContent = 'Geçerli bir fiyat yaz (ör. 4,5).';
    return;
  }
  const q = state.question;
  state.result = { guess, ...scoreGuess(guess, q.price) };
  state.played += 1;
  state.total += state.result.score;
  renderResult(q, state.result);
}

function verdictText(r) {
  if (r.direction === 'exact') return 'Neredeyse tam isabet!';
  return `${formatRatio(r.factor)} kat ${r.direction === 'over' ? 'fazla' : 'az'} tahmin ettin`;
}

function renderResult(q, r) {
  $('r-title').textContent = `${formatPeriod(q.date)} · ${questionTitle(q)}`;
  $('r-unit').textContent = q.region ? `${q.unit} · ${q.region}` : q.unit;
  $('r-guess').textContent = formatPrice(r.guess);
  $('r-actual').textContent = formatPrice(q.price);
  $('r-verdict').textContent = verdictText(r);
  $('r-score').textContent = `${r.score}/100`;

  const hasCurrent = q.current !== null;
  $('r-current-row').hidden = !hasCurrent;
  if (hasCurrent) {
    $('r-current-label').textContent = `Bugün (${formatPeriod(q.current.date)})`;
    $('r-current').textContent = formatPrice(q.current.price);
    $('r-increase').textContent = `${formatRatio(q.current.price / q.price)} kat arttı`;
  }

  $('r-source').href = q.source.url;
  $('r-source').textContent = q.source.title;
  $('r-session').textContent = `Bu oturum: ${state.played} soru · ortalama ${Math.round(state.total / state.played)} puan`;
  show('result-screen');
}

async function share() {
  const q = state.question;
  const r = state.result;
  const text = [
    'Ne Kadardı? 🧾',
    `${formatPeriod(q.date)} · ${questionTitle(q)} (${q.unit})`,
    `${verdictText(r)} · ${r.score}/100`,
    location.href,
  ].join('\n');
  try {
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      $('share-btn').textContent = 'Kopyalandı!';
    }
  } catch (err) {
    // User cancelled the share sheet or clipboard is unavailable; nothing to do.
    console.warn(err);
  }
}

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.all = buildQuestions(await res.json());
  } catch (err) {
    console.error(err);
    showMessage('Veri yüklenemedi. Sayfayı yerel bir sunucuyla açtığından emin ol.');
    return;
  }
  if (state.all.length === 0) {
    showMessage('Henüz doğrulanmış fiyat yok. Kaynaklı veri eklendiğinde sorular burada görünecek.');
    return;
  }
  state.pool = state.all;
  setupYearFilter();
  $('guess-form').addEventListener('submit', onGuess);
  $('next-btn').addEventListener('click', () => {
    $('share-btn').textContent = 'Paylaş';
    nextQuestion();
  });
  $('share-btn').addEventListener('click', share);
  nextQuestion();
}

init();
