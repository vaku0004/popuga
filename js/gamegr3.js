/* ───────── Synonyms Game – main.js (улучшено) ───────── */

const statusImage   = document.querySelector('.status-image');
const TOTAL_ROUNDS  = 10;

/* Локальная дата (день меняется по локальному времени пользователя) */
const dateKey       = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

const scoreHistory  = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints  = +localStorage.getItem('availableHints') || 0;
let starsEarned     = +localStorage.getItem('starsEarned')    || 0;
let wordStats       = JSON.parse(localStorage.getItem('wordStats')     || '{}');

let currentIndex    = 0, 
    scoreToday      = 0,
    shuffledPairs   = [];

/* ───────── Утилиты ───────── */

function normalize(text = '') {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // убрать диакритику
    .toLowerCase()
    .replace(/['’]/g, '')
    .trim();
}

/* Очистка старых ключей и ограничение истории результатов */
function cleanupOldData(daysToKeep = 14, maxScores = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  // 1) Чистим usedMain-* старше cutoff
  // Идём в обратном порядке, чтобы безопасно удалять ключи
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('usedMain-')) {
      const dateStr = key.slice('usedMain-'.length);
      const d = new Date(dateStr);
      if (!Number.isNaN(+d) && d < cutoff) {
        localStorage.removeItem(key);
      }
    }
  }

  // 2) Оставляем только последние maxScores результатов в synonymScores
  let scores = JSON.parse(localStorage.getItem('synonymScores') || '{}');
  const dateKeys = Object.keys(scores)
    .filter(k => !Number.isNaN(+new Date(k)))
    .sort((a, b) => +new Date(b) - +new Date(a)); // по убыванию (новые первые)

  if (dateKeys.length > maxScores) {
    for (let i = maxScores; i < dateKeys.length; i++) {
      delete scores[dateKeys[i]];
    }
    localStorage.setItem('synonymScores', JSON.stringify(scores));
  }
}

/* ───────── Выбор слов ───────── */

function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');
  wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

  // ✅ Валидация слова
  const validPairs = (Array.isArray(wordPairs) ? wordPairs : []).filter(p =>
    p &&
    typeof p.main === 'string' &&
    typeof p.correct === 'string' &&
    Array.isArray(p.options) &&
    p.options.length >= 2 &&
    p.options.some(o => normalize(o) === normalize(p.correct))
  );

  // Обновление статистики: если подряд ≥3 правильных — ошибки обнуляем
  for (const key in wordStats) {
    const s = wordStats[key];
    if (s && s.correctInARow >= 3) {
      s.errors = 0;
    }
    // Преждевременно не удаляем «освоенные» из wordStats (копим долгую историю)
  }
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  // Приоритизация
  const scored = validPairs.map(pair => {
    const s = wordStats[pair.main] || { views: 0, errors: 0 };
    const score = (s.errors + 1) / (s.views + 1); // выше — приоритетнее
    return { ...pair, _priority: score, _views: s.views };
  });

  const newWords = scored.filter(p => p._views === 0 && !usedMainToday.includes(p.main));
  const errorWords = scored.filter(p => (wordStats[p.main]?.errors || 0) > 0 && !usedMainToday.includes(p.main));
  const learnedWords = scored.filter(p =>
    p._views > 0 &&
    (wordStats[p.main]?.errors || 0) === 0 &&
    !usedMainToday.includes(p.main)
  );

  let selected = [];

  // 1) Новые
  selected = selected.concat(newWords.slice(0, TOTAL_ROUNDS));

  // 2) Ошибочные (сначала самые «проблемные», затем небольшая рандомизация)
  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const topErrors = errorWords
      .slice() // не мутируем исходный
      .sort((a, b) => b._priority - a._priority)
      .slice(0, 20)
      .sort(() => Math.random() - 0.5)
      .slice(0, need);
    selected = selected.concat(topErrors);
  }

  // 3) Освоенные — по циклу (чтобы не залипать на одних и тех же)
  if (selected.length < TOTAL_ROUNDS && learnedWords.length > 0) {
    const need = TOTAL_ROUNDS - selected.length;
    const sortedLearned = learnedWords.slice().sort((a, b) => a.main.localeCompare(b.main));
    const fallback = [];

    let lastIndex = +localStorage.getItem('lastLearnedIndex') || 0;

    for (let i = 0; i < need && sortedLearned.length > 0; i++) {
      const index = (lastIndex + i) % sortedLearned.length;
      fallback.push(sortedLearned[index]);
    }

    if (sortedLearned.length > 0) {
      localStorage.setItem('lastLearnedIndex', (lastIndex + need) % sortedLearned.length);
    }
    selected = selected.concat(fallback);
  }

  // 4) Добивка — любые валидные, без дублей по main
  if (selected.length < TOTAL_ROUNDS) {
    const selectedMains = new Set(selected.map(p => p.main));
    const backup = validPairs
      .filter(p => !selectedMains.has(p.main))
      .sort(() => Math.random() - 0.5)
      .slice(0, TOTAL_ROUNDS - selected.length);
    selected = selected.concat(backup);
  }

  // финальная перетасовка
  selected = selected.slice(0, TOTAL_ROUNDS).sort(() => Math.random() - 0.5);

  // отмечаем «использованные сегодня»
  const updatedUsed = Array.from(new Set(usedMainToday.concat(selected.map(p => p.main))));
  localStorage.setItem(`usedMain-${dateKey}`, JSON.stringify(updatedUsed));

  return selected;
}

/* ───────── UI helpers ───────── */

function updateHintDisplay() {
  const el = document.getElementById('hintCount');
  if (el) el.textContent = availableHints;
  const btn = document.getElementById('hintButton');
  if (btn) btn.disabled = availableHints <= 0;
}

function updateCurrentScore() {
  const scoreEl = document.getElementById('currentScore');
  if (scoreEl) scoreEl.textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
  const emojiEl = document.getElementById('scoreEmojis');
  if (emojiEl) emojiEl.textContent = '🏅'.repeat(starsEarned);
}

/* ───────── Игровой цикл ───────── */

function displayWord() {
  if (!shuffledPairs || !shuffledPairs[currentIndex]) {
    console.error('[displayWord] Нет данных для показа:', { currentIndex, shuffledPairs });
    const res = document.getElementById('result');
    if (res) res.textContent = 'Нет задания для показа.';
    return;
  }

  const roundText = document.getElementById('roundNumber');
  if (roundText) {
    roundText.textContent = `Round ${currentIndex + 1}`;
    roundText.classList.remove('fade-in');
    void roundText.offsetWidth;
    roundText.classList.add('fade-in');
  }

  const res = document.getElementById('result');
  if (res) {
    res.textContent = '';
    res.classList.remove('correct', 'incorrect');
  }
  if (statusImage) statusImage.src = 'img/orange/neutral.svg';

  const main = shuffledPairs[currentIndex].main;
  wordStats[main] = wordStats[main] || { views: 0, correct: 0, errors: 0, correctInARow: 0 };
  wordStats[main].views++;
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  const mainEl = document.getElementById('mainWord');
  if (mainEl) mainEl.textContent = main;

  updateCurrentScore();
  generateOptions();
}

function generateOptions() {
  const container = document.getElementById('optionsContainer');
  if (!container) return;
  container.innerHTML = '';

  const current = shuffledPairs[currentIndex];
  if (!current || !Array.isArray(current.options) || current.options.length === 0) {
    console.error('[generateOptions] Некорректные данные:', current);
    const res = document.getElementById('result');
    if (res) res.textContent = 'Ошибка данных: нет вариантов ответа.';
    return;
  }

  const correct = normalize(current.correct);
  const options = current.options.slice().sort(() => Math.random() - 0.5);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-button';
    btn.textContent = opt;
    // (оставляем dataset.correct как есть; для «анти-чит» можно убрать и держать ответ в замыкании)
    btn.dataset.correct = String(normalize(opt) === correct);
    btn.onclick = () => selectOption(opt, btn);
    container.appendChild(btn);
  });
}

function showHint() {
  if (availableHints <= 0) return;

  availableHints = Math.max(0, availableHints - 1);
  localStorage.setItem('availableHints', availableHints);
  updateHintDisplay();

  const buttons = document.querySelectorAll('.option-button');
  const wrongButtons = [...buttons].filter(btn => btn.dataset.correct === 'false');
  const toFade = wrongButtons.sort(() => Math.random() - 0.5).slice(0, wrongButtons.length <= 2 ? 1 : 2);
  toFade.forEach(btn => {
    btn.classList.add('faded');
    btn.disabled = true;
  });
}

function selectOption(selectedText, btn) {
  const current = shuffledPairs[currentIndex];
  const correct = current.correct;
  const main = current.main;

  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');

  // моментально дизейблим все кнопки + hint
  allButtons.forEach(b => b.disabled = true);
  const hintButton = document.getElementById('hintButton');
  if (hintButton) hintButton.disabled = true;

  let delay;
  if (normalize(selectedText) === normalize(correct)) {
    scoreToday++;
    wordStats[main].correct++;
    wordStats[main].correctInARow = (wordStats[main].correctInARow || 0) + 1;

    if (wordStats[main].correctInARow >= 3) {
      wordStats[main].errors = 0;
    }

    if (res) {
      res.textContent = 'Correct!';
      res.classList.add('correct');
    }
    if (statusImage) statusImage.src = 'img/orange/right.svg';
    btn.classList.add('correct');
    delay = 2000;
  } else {
    wordStats[main].errors++;
    wordStats[main].correctInARow = 0;

    if (res) {
      res.textContent = `Incorrect. Answer: ${correct}`;
      res.classList.add('incorrect');
    }
    if (statusImage) statusImage.src = 'img/orange/wrong.svg';
    btn.classList.add('incorrect');

    const correctBtn = [...allButtons].find(b => normalize(b.textContent) === normalize(correct));
    if (correctBtn) correctBtn.classList.add('correct');

    delay = 5000;
  }

  localStorage.setItem('wordStats', JSON.stringify(wordStats));
  updateHintDisplay();

  if (currentIndex < TOTAL_ROUNDS - 1) {
    currentIndex++;
    setTimeout(displayWord, delay);
  } else {
    setTimeout(endGame, delay);
  }
}

function endGame() {
  scoreHistory[dateKey] = scoreToday;
  localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

  const res = document.getElementById('result');
  if (res) res.classList.remove('correct', 'incorrect');

  if (scoreToday === TOTAL_ROUNDS) {
    if (statusImage) statusImage.src = 'img/orange/winner.svg';
    starsEarned++;
    // Экономика подсказок по-чуть-чуть
    availableHints = Math.min(10, availableHints + 2);

    if (starsEarned >= 3) {
      availableHints = Math.min(10, availableHints + 2);
      starsEarned = 0;
    }

    if (res) res.textContent = `🏅 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  } else {
    if (statusImage) statusImage.src = 'img/orange/looser.svg';
    if (res) res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  }

  localStorage.setItem('availableHints', availableHints);
  localStorage.setItem('starsEarned', starsEarned);
  updateHintDisplay();
  updateCurrentScore();

  const box = document.getElementById('restartContainer');
  if (box) {
    box.innerHTML = `
      <br>
      <button class="restart-button blue-button" onclick="startGame()">Try Again (Same Words)</button>
      <button class="restart-button red-button" onclick="restartWithNewWords()">New Game (New Words)</button>
      <button class="nextbutton" onclick="location.href='cardsdefinitions.html'">Next</button>
    `;
  }
}

function startGame() {
  currentIndex = 0;
  scoreToday = 0;
  const res = document.getElementById('result');
  if (res) res.textContent = "Let's get started!";
  const box = document.getElementById('restartContainer');
  if (box) box.innerHTML = '';
  updateHintDisplay();
  updateCurrentScore();
  displayWord();
}

function restartWithNewWords() {
  // оставляем usedMain-<today> как «анти-повторы» в рамках дня
  shuffledPairs = getShuffledPairs();
  startGame();
}

/* ───────── Инициализация ───────── */

document.addEventListener('DOMContentLoaded', () => {
  // автоочистка данных: 14 дней usedMain-*, 30 последних результатов
  cleanupOldData(14, 30);

  // начальная партия
  shuffledPairs = getShuffledPairs();

  updateHintDisplay();
  updateCurrentScore();
  displayWord();
});
