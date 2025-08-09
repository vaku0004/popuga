// ==== Synonyms/Vocab Game – game1.js ====
// Подключай ПОСЛЕ data/vocabulary.js (без type="module").
// Работает и с переменной vocabulary, и с wordPairs.

const TOTAL_ROUNDS = 10;
// Локальная дата (YYYY-MM-DD), чтобы день считался по местному времени
const dateKey = new Date().toLocaleDateString('sv-SE');

const scoreHistory  = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints  = +localStorage.getItem('availableHints') || 0;
let starsEarned     = +localStorage.getItem('starsEarned')    || 0;
let userWordStats   = JSON.parse(localStorage.getItem('userWordStats') || '{}');

let statusImage;
let DATA = [];                 // нормализованный массив карточек
let shuffledPairs = [];        // карточки текущей игры
let currentIndex  = 0;
let scoreToday    = 0;
let hintUsedThisRound = false; // подсказка один раз за раунд

/* ---------- helpers ---------- */
function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/['’]/g, '').trim();
}

// Fisher–Yates shuffle
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// уборка localStorage: старые usedMain-* и длинная история очков
function pruneStorage(days = 14, keepScores = 60) {
  try {
    const today = new Date(dateKey);
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('usedMain-')) {
        const d = new Date(k.slice(9));
        const diffDays = (today - d) / 86400000;
        if (!isNaN(diffDays) && diffDays > days) localStorage.removeItem(k);
      }
    }
    const scores = JSON.parse(localStorage.getItem('synonymScores') || '{}');
    const dates = Object.keys(scores).sort();
    while (dates.length > keepScores) {
      const rm = dates.shift();
      delete scores[rm];
    }
    localStorage.setItem('synonymScores', JSON.stringify(scores));
  } catch (e) {
    console.warn('[pruneStorage] skipped:', e);
  }
}

/* если у карточки нет options — создаём (берём другие correct как отвлекающие) */
function buildOptionsFor(pair) {
  if (!pair) return pair;
  if (Array.isArray(pair.options) && pair.options.length >= 2) return pair;

  const pool = DATA
    .filter(p => p && p.main !== pair.main && p.correct && normalize(p.correct) !== normalize(pair.correct))
    .map(p => p.correct);

  const wrong = shuffle([...new Set(pool)]).slice(0, 3);
  pair.options = shuffle([pair.correct, ...wrong]);
  return pair;
}

/* ---------- подбор раундов (без повторов по main) ---------- */
function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');
  const usedToday = new Set(usedMainToday);

  userWordStats = JSON.parse(localStorage.getItem('userWordStats') || '{}');

  // чистим статистику
  for (const word in userWordStats) {
    const s = userWordStats[word];
    if (s.correctInARow >= 3) s.errors = 0;
    if (s.views > 10 && s.errors === 0) delete userWordStats[word]; // «освоенные»
  }
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  const scored = DATA.map(pair => {
    const s = userWordStats[pair.main] || { views: 0, errors: 0 };
    const priority = (s.errors + 1) / (s.views + 1); // чаще ошибки при малом числе просмотров
    return { ...pair, _priorityScore: priority, views: s.views };
  });

  const newWords   = scored.filter(p => p.views === 0);
  const errorWords = scored.filter(p => userWordStats[p.main]?.errors > 0);
  const learned    = scored.filter(p => !newWords.some(n => n.main === p.main) &&
                                        !errorWords.some(e => e.main === p.main));

  let selected = [];
  let selectedMains = new Set();

  function pushAndMark(list) {
    for (const p of list) {
      if (!selectedMains.has(p.main) && !usedToday.has(p.main)) {
        selected.push(p);
        selectedMains.add(p.main);
        if (selected.length === TOTAL_ROUNDS) break;
      }
    }
  }

  // 1) новые (случайный порядок, но не использованные сегодня)
  pushAndMark(shuffle(newWords).slice(0, TOTAL_ROUNDS));

  // 2) ошибочные: топ-20 по приоритету, затем перемешиваем
  if (selected.length < TOTAL_ROUNDS) {
    const pool = shuffle(
      errorWords.sort((a, b) => b._priorityScore - a._priorityScore).slice(0, 20)
    );
    pushAndMark(pool);
  }

  // 3) освоенные (циклично, без повторов с selected/usedToday)
  if (selected.length < TOTAL_ROUNDS) {
    const sortedLearned = learned
      .filter(p => !selectedMains.has(p.main) && !usedToday.has(p.main))
      .sort((a, b) => a.main.localeCompare(b.main));

    const need = TOTAL_ROUNDS - selected.length;
    if (sortedLearned.length > 0) {
      let lastIndex = +localStorage.getItem('lastLearnedIndex') || 0;
      for (let i = 0; i < need; i++) {
        const item = sortedLearned[(lastIndex + i) % sortedLearned.length];
        if (!selectedMains.has(item.main)) {
          selected.push(item);
          selectedMains.add(item.main);
        }
      }
      localStorage.setItem('lastLearnedIndex', (lastIndex + need) % sortedLearned.length);
    }
  }

  // 4) если всё ещё мало — Fallback #1: игнорируем usedToday, но без повторов в selected
  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const extraIgnoreUsed = shuffle(
      DATA.filter(p => !selectedMains.has(p.main))
    ).slice(0, need);
    for (const p of extraIgnoreUsed) {
      if (!selectedMains.has(p.main)) {
        selected.push(p);
        selectedMains.add(p.main);
        if (selected.length === TOTAL_ROUNDS) break;
      }
    }
  }

  // 5) Fallback #2: если и это не помогло — берём вообще любые (на всякий случай)
  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const emergency = shuffle(DATA).slice(0, need);
    for (const p of emergency) {
      if (!selectedMains.has(p.main)) {
        selected.push(p);
        selectedMains.add(p.main);
        if (selected.length === TOTAL_ROUNDS) break;
      }
    }
  }

  // финальная дедупликация по main + генерация options + перемешивание раундов
  const seen = new Set();
  selected = shuffle(
    selected.filter(p => (seen.has(p.main) ? false : (seen.add(p.main), true)))
            .slice(0, TOTAL_ROUNDS)
            .map(buildOptionsFor)
  );

  // сохраняем использованные за сегодня (без дублей)
  const updatedUsed = [...new Set([...usedToday, ...selected.map(p => p.main)])];
  localStorage.setItem(`usedMain-${dateKey}`, JSON.stringify(updatedUsed));

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

/* ---------- рендер одного раунда ---------- */
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
  const currentMain = pair.main;

  if (!userWordStats[currentMain]) userWordStats[currentMain] = { views: 0, correct: 0, errors: 0, correctInARow: 0 };
  userWordStats[currentMain].views++;
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  const mw = document.getElementById('mainWord');
  if (mw) mw.textContent = currentMain;

  // сброс «подсказка этого раунда» и разблокировка кнопки (если есть хинты)
  hintUsedThisRound = false;
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
  // подсказка — только 1 раз за раунд
  if (hintUsedThisRound) return;
  if (availableHints <= 0) return;

  // уменьшаем счётчик и сразу блокируем кнопку, чтобы не кликали повторно
  availableHints--;
  localStorage.setItem('availableHints', availableHints);
  updateHintDisplay();

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.disabled = true;

  const buttons = [...document.querySelectorAll('.option-button')];
  const wrongButtons = buttons.filter(b => b.dataset.correct === 'false' && !b.classList.contains('faded'));

  // оставим минимум 2 кнопки на экране
  const toHideCount = Math.min(2, Math.max(0, wrongButtons.length - 1));
  if (toHideCount > 0) {
    const toFade = shuffle(wrongButtons).slice(0, toHideCount);
    toFade.forEach(b => { b.classList.add('faded'); b.disabled = true; });
  }

  hintUsedThisRound = true;
}

function selectOption(selectedText, btn) {
  const correct = shuffledPairs[currentIndex].correct;
  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');
  allButtons.forEach(b => b.disabled = true);
  const hintBtn = document.getElementById('hintButton'); if (hintBtn) hintBtn.disabled = true;

  const currentMain = shuffledPairs[currentIndex].main;
  const isCorrect = normalize(selectedText) === normalize(correct);
  let delay;

  if (isCorrect) {
    scoreToday++;
    userWordStats[currentMain].correct++;
    userWordStats[currentMain].correctInARow = (userWordStats[currentMain].correctInARow || 0) + 1;
    if (userWordStats[currentMain].correctInARow >= 3) userWordStats[currentMain].errors = 0;
    if (res) { res.textContent = 'Correct!'; res.classList.add('correct'); }
    if (statusImage) statusImage.src = 'img/orange/right.svg';
    if (btn) btn.classList.add('correct');
    delay = 2000;
  } else {
    userWordStats[currentMain].errors++;
    userWordStats[currentMain].correctInARow = 0;
    if (res) { res.textContent = `Incorrect. Answer: ${correct}`; res.classList.add('incorrect'); }
    if (statusImage) statusImage.src = 'img/orange/wrong.svg';
    if (btn) btn.classList.add('incorrect');

    const correctBtn = [...allButtons].find(b => normalize(b.textContent) === normalize(correct));
    if (correctBtn) correctBtn.classList.add('correct');
    delay = 5000;
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
      <button class="restart-button red-button" onclick="restartWithNewWords()">New Game (New Words)</button>
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

function restartWithNewWords() {
  shuffledPairs = getShuffledPairs();
  startGame();
}

/* ---------- Инициализация + диагностика данных ---------- */
document.addEventListener('DOMContentLoaded', () => {
  statusImage = document.querySelector('.status-image');

  let RAW;
  let nameUsed = null;

  if (typeof wordPairs !== 'undefined') { RAW = wordPairs; nameUsed = 'wordPairs'; }
  else if (typeof vocabulary !== 'undefined') { RAW = vocabulary; nameUsed = 'vocabulary'; }

  function coerceToArray(x) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === 'object') return Object.values(x);
    return [];
  }

  DATA = coerceToArray(RAW).map(it => {
    const main    = it.main    ?? it.question ?? it.q ?? '';
    const correct = it.correct ?? it.answer   ?? it.a ?? '';
    const options = Array.isArray(it.options) ? it.options.slice() : (it.choices || it.opts || []);
    return { main, correct, options };
  }).filter(it => typeof it.main === 'string' && it.main &&
                  typeof it.correct === 'string' && it.correct);

  // Диагностика
  if (!nameUsed) {
    console.error('[game] Не найден ни "wordPairs", ни "vocabulary". Проверь подключение data/vocabulary.js ПЕРЕД js/game1.js.');
    const scripts = [...document.scripts].map(s => s.src || '(inline)');
    console.log('[game] Подключённые скрипты:', scripts);
    return;
  }
  if (!DATA.length) {
    console.error(`[game] ${nameUsed} загружен, но данных нет или формат неожиданный. Проверь содержимое data/vocabulary.js`);
    console.log('[game] RAW type:', typeof RAW, 'Array?', Array.isArray(RAW), 'keys:', RAW && Object.keys(RAW).slice(0,5));
    return;
  }

  pruneStorage(); // чистим старые usedMain-* и подрезаем историю очков
  shuffledPairs = getShuffledPairs();

  if (!shuffledPairs.length) {
    console.error('[game] Не удалось собрать раунды (shuffledPairs пуст). Проверь фильтры usedMain-* и формат данных.');
    return;
  }

  updateHintDisplay();
  updateCurrentScore();
  displayWord();

  const hintBtn = document.getElementById('hintButton');
  if (hintBtn) hintBtn.addEventListener('click', showHint);
});
