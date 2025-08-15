// ==== Synonyms/Vocab Game – game1.js ====
// Подключай после data/vocabulary.js (без type="module").
// <script src="data/vocabulary.js"></script>
// <script src="js/game1.js"></script>

const TOTAL_ROUNDS = 10;
const dateKey = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD локально

// --- персист ---
const scoreHistory  = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints  = +localStorage.getItem('availableHints') || 0;
let starsEarned     = +localStorage.getItem('starsEarned')    || 0;
// Статистика по словам: ключ = slug(main)
let userWordStats   = JSON.parse(localStorage.getItem('userWordStats') || '{}');

// --- ключи множеств для отбора ---
const SEEN_KEY = 'seenEverSlugs';          // Слова, которые когда-либо показывались (slug[])
const USED_TODAY_KEY = `usedToday-${dateKey}`; // Слова, показанные сегодня (slug[])

// --- состояние игры ---
let statusImage;
let DATA = [];          // [{ main, correct, options[], _k: slug }]
let shuffledPairs = []; // выбранные на игру карточки
let currentIndex  = 0;
let scoreToday    = 0;

// --- множества «когда-либо видели» и «сегодня уже давали»
function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}
function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}
let seenEver  = loadSet(SEEN_KEY);
let usedToday = loadSet(USED_TODAY_KEY);

/* ---------- helpers ---------- */
function normalize(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ') // все неразрывные/узкие пробелы → обычный
    .replace(/[‘’ʼ´`]/g, "'")                                 // разные апострофы → '
    .replace(/[“”]/g, '"')                                    // умные кавычки → "
    .toLowerCase()
    .replace(/["']/g, '')                                     // убираем кавычки
    .replace(/\s+/g, ' ')
    .trim();
}
function slugOf(main) { return normalize(main); }

// Fisher–Yates
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* аккуратная миграция к slug-ключам (если раньше ключами были сырые main) */
function migrateStorageToSlugs() {
  try {
    const raw = JSON.parse(localStorage.getItem('userWordStats') || '{}');
    const migrated = {};
    for (const oldKey in raw) {
      const s = raw[oldKey] || {};
      const k = slugOf(oldKey);
      if (!migrated[k]) migrated[k] = { views: 0, correct: 0, errors: 0, correctInARow: 0, learned: false };
      migrated[k].views         = Math.max(migrated[k].views || 0, s.views || 0);
      migrated[k].correct       = Math.max(migrated[k].correct || 0, s.correct || 0);
      migrated[k].errors        = Math.max(migrated[k].errors || 0, s.errors || 0);
      migrated[k].correctInARow = Math.max(migrated[k].correctInARow || 0, s.correctInARow || 0);
      migrated[k].learned       = Boolean(migrated[k].learned || s.learned);
    }
    localStorage.setItem('userWordStats', JSON.stringify(migrated));
  } catch (e) {
    console.warn('[migrateStorageToSlugs] skipped:', e);
  }
}

/* если у карточки нет options — создаём (берём другие correct как отвлекающие) */
function buildOptionsFor(pair) {
  if (!pair) return pair;
  if (Array.isArray(pair.options) && pair.options.length >= 2) return pair;

  const pool = DATA
    .filter(p => p && p._k !== pair._k && p.correct && normalize(p.correct) !== normalize(pair.correct))
    .map(p => p.correct);

  const wrong = shuffle([...new Set(pool)]).slice(0, 3);
  pair.options = shuffle([pair.correct, ...wrong]);
  return pair;
}

/* ---------- правила показа: новые → ошибочные → освоенные ---------- */
/*
  Определения:
  - new:      нет в seenEver И нет в usedToday (то есть ещё никогда не выдавались, и не отобраны сегодня)
  - error:    stats.errors > 0 и нет в usedToday
  - learned:  stats.learned === true ИЛИ (views > 0 && errors === 0 && correctInARow >= 3), и нет в usedToday

  Новые показываются только один раз «в жизни»: как только мы их отобрали в партию — записываем в seenEver.
  В течение дня одно и то же слово не даём повторно: ведём usedToday.
*/
function getShuffledPairs() {
  userWordStats = JSON.parse(localStorage.getItem('userWordStats') || '{}');

  // авто-логика «освоенности»
  for (const slug in userWordStats) {
    const s = userWordStats[slug];
    if ((s.correctInARow || 0) >= 3) { s.errors = 0; s.learned = true; }
  }
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  const scored = DATA.map(pair => {
    const k = pair._k;
    const s = userWordStats[k] || { views: 0, correct: 0, errors: 0, correctInARow: 0, learned: false };
    return { ...pair, _s: s };
  });

  // Пулы
  const newPool = scored.filter(p => !seenEver.has(p._k) && !usedToday.has(p._k));
  const errorPool = scored.filter(p => (p._s.errors || 0) > 0 && !usedToday.has(p._k));
  const learnedPool = scored.filter(p =>
    !usedToday.has(p._k) &&
    (p._s.learned === true ||
     ((p._s.views || 0) > 0 && (p._s.errors || 0) === 0 && (p._s.correctInARow || 0) >= 3))
  );

  let selected = [];
  const picked = new Set(); // защита от дублей внутри одной партии

  function takeFrom(pool, need) {
    const out = [];
    for (const p of shuffle(pool)) { // Жёстко перемешиваем пул
      if (out.length >= need) break;
      if (!picked.has(p._k)) { out.push(p); picked.add(p._k); }
    }
    return out;
  }

  // 1) Новые
  if (selected.length < TOTAL_ROUNDS && newPool.length > 0) {
    selected = selected.concat(takeFrom(newPool, TOTAL_ROUNDS - selected.length));
  }

  // 2) Ошибочные
  if (selected.length < TOTAL_ROUNDS && errorPool.length > 0) {
    selected = selected.concat(takeFrom(errorPool, TOTAL_ROUNDS - selected.length));
  }

  // 3) Освоенные
  if (selected.length < TOTAL_ROUNDS && learnedPool.length > 0) {
    selected = selected.concat(takeFrom(learnedPool, TOTAL_ROUNDS - selected.length));
  }

  // 4) Добиваем чем угодно, что ещё не давали сегодня/не выбрано
  if (selected.length < TOTAL_ROUNDS) {
    const fallback = scored.filter(p => !picked.has(p._k) && !usedToday.has(p._k));
    selected = selected.concat(takeFrom(fallback, TOTAL_ROUNDS - selected.length));
  }

  // Сразу фиксируем: «сегодня уже давали» и «когда-то видели» — чтобы не вернулись при рестартах
  if (selected.length) {
    const slugs = selected.map(p => p._k);
    slugs.forEach(k => usedToday.add(k));
    slugs.forEach(k => seenEver.add(k));
    saveSet(USED_TODAY_KEY, usedToday);
    saveSet(SEEN_KEY, seenEver);
  }

  // Генерим варианты и перемешиваем порядок раундов
  selected = selected.slice(0, TOTAL_ROUNDS).map(buildOptionsFor);
  selected = shuffle(selected);

  // Фоллбэк
  if (!selected.length && DATA.length) {
    console.warn('[getShuffledPairs] пусто, беру случайные без фильтров');
    selected = shuffle(DATA.slice()).slice(0, TOTAL_ROUNDS).map(buildOptionsFor);
  }

  return selected;
}

/* ---------- UI state ---------- */
function updateHintDisplay() {
  const c = document.getElementById('hintCount');
  const b = document.getElementById('hintButton');
  if (c) c.textContent = availableHints;
  if (b) b.disabled = availableHints <= 0;
}

function updateCurrentScore() {
  const s = document.getElementById('currentScore');
  const e = document.getElementById('scoreEmojis');
  if (s) s.textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
  if (e) e.textContent = '🏅'.repeat(starsEarned);
}

/* ---------- рендер раунда ---------- */
function displayWord() {
  if (!Array.isArray(shuffledPairs) || shuffledPairs.length === 0) {
    console.error('[displayWord] shuffledPairs пуст. Проверь DATA (vocabulary).');
    const mw = document.getElementById('mainWord');
    if (mw) mw.textContent = '(no data)';
    return;
  }
  if (currentIndex >= shuffledPairs.length) currentIndex = 0;

  const roundText = document.getElementById('roundNumber');
  if (roundText) {
    roundText.textContent = `Round ${currentIndex + 1}`;
    roundText.classList.remove('fade-in'); void roundText.offsetWidth; roundText.classList.add('fade-in');
  }

  const res = document.getElementById('result');
  if (res) { res.textContent = ''; res.classList.remove('correct','incorrect'); }
  if (statusImage) statusImage.src = 'img/orange/neutral.svg';

  const pair = shuffledPairs[currentIndex];
  const k = pair._k; // slug

  if (!userWordStats[k]) userWordStats[k] = { views: 0, correct: 0, errors: 0, correctInARow: 0, learned: false };
  userWordStats[k].views++;
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  const mw = document.getElementById('mainWord');
  if (mw) mw.textContent = pair.main;

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.disabled = availableHints <= 0;

  updateCurrentScore();
  generateOptions();
}

function generateOptions() {
  const container = document.getElementById('optionsContainer');
  if (!container) return;
  container.innerHTML = '';

  const current = shuffledPairs[currentIndex];
  if (!current || !current.correct) {
    console.error('[generateOptions] плохая карточка:', current);
    return;
  }
  if (!Array.isArray(current.options) || current.options.length === 0) {
    buildOptionsFor(current);
  }

  const correct = normalize(current.correct);
  const options = shuffle(current.options.slice());

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-button';
    btn.textContent = opt;
    btn.dataset.correct = String(normalize(opt) === correct);
    btn.onclick = () => selectOption(opt, btn);
    container.appendChild(btn);
  });
}

/* ---------- хинты / выбор ---------- */
function showHint() {
  if (availableHints <= 0) return;
  availableHints--;
  localStorage.setItem('availableHints', availableHints);
  updateHintDisplay();

  const buttons = document.querySelectorAll('.option-button:not(.faded)');
  const total = buttons.length;
  if (total <= 1) return; // уже нечего скрывать

  const wrongButtons = [...buttons].filter(b => b.dataset.correct === 'false');

  let keepWrong = (total >= 3) ? 1 : 0; // при ≥3 вариантах оставляем 1 неверную, при 2 вариантах — 0
  let needToHide = wrongButtons.length - keepWrong;
  if (needToHide <= 0) return;

  const toFade = shuffle(wrongButtons).slice(0, needToHide);
  toFade.forEach(b => { b.classList.add('faded'); b.disabled = true; });
}


function selectOption(selectedText, btn) {
  const pair = shuffledPairs[currentIndex];
  const k = pair._k;
  const correct = pair.correct;
  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');
  allButtons.forEach(b => b.disabled = true);
  const hintBtn = document.getElementById('hintButton'); if (hintBtn) hintBtn.disabled = true;

  const isCorrect = normalize(selectedText) === normalize(correct);
  let delay;

  if (isCorrect) {
    scoreToday++;
    userWordStats[k].correct++;
    userWordStats[k].correctInARow = (userWordStats[k].correctInARow || 0) + 1;
    if (userWordStats[k].correctInARow >= 3) {
      userWordStats[k].errors = 0;
      userWordStats[k].learned = true;
    }
    if (res) { res.textContent = 'Correct!'; res.classList.add('correct'); }
    if (statusImage) statusImage.src = 'img/orange/right.svg';
    if (btn) btn.classList.add('correct');
    delay = 1600;
  } else {
    userWordStats[k].errors++;
    userWordStats[k].correctInARow = 0;
    userWordStats[k].learned = false; // ошибка снимает «выученность»
    if (res) { res.textContent = `Incorrect. Answer: ${correct}`; res.classList.add('incorrect'); }
    if (statusImage) statusImage.src = 'img/orange/wrong.svg';
    if (btn) btn.classList.add('incorrect');

    const correctBtn = [...allButtons].find(b => normalize(b.textContent) === normalize(correct));
    if (correctBtn) correctBtn.classList.add('correct');
    delay = 2600;
  }

  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));
  updateHintDisplay();

  if (currentIndex < TOTAL_ROUNDS - 1) {
    currentIndex++;
    setTimeout(displayWord, delay);
  } else {
    setTimeout(endGame, delay);
  }
}

/* ---------- конец игры / рестарт ---------- */
function endGame() {
  scoreHistory[dateKey] = scoreToday;
  localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

  const res = document.getElementById('result');
  if (res) res.classList.remove('correct', 'incorrect');

  if (scoreToday === TOTAL_ROUNDS) {
    if (statusImage) statusImage.src = 'img/orange/winner.svg';
    starsEarned++; availableHints++;
    if (starsEarned >= 3) { availableHints += 10; starsEarned = 0; }
    if (res) res.textContent = `🏅 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  } else {
    if (statusImage) statusImage.src = 'img/orange/looser.svg';
    if (res) res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  }

  localStorage.setItem('availableHints', availableHints);
  localStorage.setItem('starsEarned', starsEarned);
  updateHintDisplay();
  updateCurrentScore();

  const rc = document.getElementById('restartContainer');
  if (rc) {
    rc.innerHTML = `
      <br>
      <button class="restart-button blue-button" onclick="startGame()">Try Again (Same Words)</button>
      <button class="restart-button red-button" onclick="restartWithNewWords()">New Game (Follow Rules)</button>
      <button class="nextbutton" onclick="location.href='mistakes.html'">Next</button>
    `;
  }
}

function startGame() {
  currentIndex = 0;
  scoreToday = 0;
  const res = document.getElementById('result'); if (res) res.textContent = "Let's get started!";
  const rc  = document.getElementById('restartContainer'); if (rc) rc.innerHTML = '';
  updateHintDisplay();
  updateCurrentScore();
  displayWord();
}

// Подбираем новую партию по тем же правилам (новые → ошибочные → освоенные)
function restartWithNewWords() {
  shuffledPairs = getShuffledPairs();
  // если вдруг пусто — безопасный фоллбэк
  if (!shuffledPairs.length && DATA.length) {
    shuffledPairs = shuffle(DATA.slice()).slice(0, TOTAL_ROUNDS).map(buildOptionsFor);
  }
  startGame();
}

/* ---------- Инициализация ---------- */
document.addEventListener('DOMContentLoaded', () => {
  statusImage = document.querySelector('.status-image');

  // 1) Берём сырые данные из wordPairs или vocabulary
  let RAW = undefined;
  if (typeof wordPairs !== 'undefined') RAW = wordPairs;
  else if (typeof vocabulary !== 'undefined') RAW = vocabulary;

  // 2) Приводим к массиву, нормализуем поля и ДЕДУП по slug
  function coerceToArray(x) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === 'object') return Object.values(x);
    return [];
  }
  function pick(obj, keys, fallback='') {
    for (const k of keys) {
      if (obj && typeof obj[k] === 'string' && obj[k].trim()) return obj[k];
    }
    return fallback;
  }

  const RAW_ARR = coerceToArray(RAW).map(it => {
    const main    = pick(it, ['main','question','q','word','term','prompt','left','src','source','en','ru','sentence']);
    const correct = pick(it, ['correct','answer','a','target','translation','synonym','right','to','definition','def','key']);
    let options = [];
    if (Array.isArray(it.options)) options = it.options.slice();
    else if (Array.isArray(it.choices)) options = it.choices.slice();
    else if (Array.isArray(it.opts)) options = it.opts.slice();
    else if (Array.isArray(it.answers)) options = it.answers.slice();
    return { main, correct, options };
  }).filter(it => typeof it.main === 'string' && it.main &&
                  typeof it.correct === 'string' && it.correct);

  // Дедуп по slug (normalize(main))
  const seen = new Set();
  DATA = [];
  for (const it of RAW_ARR) {
    const _k = slugOf(it.main);
    if (!seen.has(_k)) {
      seen.add(_k);
      DATA.push({ ...it, _k });
    }
  }

  console.log('[init] DATA size (dedup by slug):', DATA.length, { sample: DATA[0] });
  if (!DATA.length) {
    console.error('[game] Данные пусты или некорректны. Проверь data/vocabulary.js и ключи полей.');
    return;
  }

  migrateStorageToSlugs();

  // стартовая партия по правилам
  shuffledPairs = getShuffledPairs();

  // Фоллбэк при инициализации
  if (!shuffledPairs.length && DATA.length) {
    shuffledPairs = shuffle(DATA.slice()).slice(0, TOTAL_ROUNDS).map(buildOptionsFor);
  }

  updateHintDisplay();
  updateCurrentScore();
  displayWord();

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.addEventListener('click', showHint);
});
