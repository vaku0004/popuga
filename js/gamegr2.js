/* ───────── Synonyms Game – main.js (обновлено) ─────────
   ✔ Приоритет: новые → ошибочные → выученные
   ✔ 1 неверный вариант скрывается, если ≤ 3 кнопок; иначе — 2
   ✔ Локальная дата, защита от повторов и мелкие баг-фиксы
*/

const statusImage   = document.querySelector('.status-image');
const TOTAL_ROUNDS  = 10;

/* Локальная дата в формате YYYY-MM-DD, чтобы «новый день» начинался в полночь вашего часового пояса */
const dateKey = new Date().toLocaleDateString('sv-SE');

const scoreHistory  = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints  = +localStorage.getItem('availableHints') || 0;
let starsEarned     = +localStorage.getItem('starsEarned')    || 0;
let wordStats       = JSON.parse(localStorage.getItem('wordStats')     || '{}');

let currentIndex    = 0;
let scoreToday      = 0;
let shuffledPairs   = getShuffledPairs();

/* -------------------- Утилиты -------------------- */
function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase()
             .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // диакритику
             .replace(/['’]/g, '')
             .trim();
}

/* -------------------- Формирование раундов -------------------- */
function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');
  wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

  /* 1. Актуализируем статистику */
  for (const w in wordStats) {
    const s = wordStats[w];
    if (s.correctInARow >= 3) s.errors = 0;                         // 3 подряд — ошибок нет
    if (s.views > 10 && s.errors === 0) delete wordStats[w];        // убираем из stats
  }
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  /* 2. Делим на группы */
  const scored = wordPairs.map(p => {
    const st = wordStats[p.main] || { views: 0, errors: 0 };
    return { ...p, _views: st.views, _errors: st.errors };
  });

  const isNew      = p => p._views === 0;
  const isError    = p => p._errors > 0;
  const notToday   = p => !usedMainToday.includes(p.main);

  const newWords      = scored.filter(p => isNew(p)   && notToday(p));
  const errorWords    = scored.filter(p => isError(p) && notToday(p));
  const learnedWords  = scored.filter(p => !isNew(p) && !isError(p) && notToday(p));

  const selected = [];
  const picked   = new Set();

  function push(arr, limit) {
    for (const item of arr) {
      if (selected.length >= limit) break;
      if (picked.has(item.main)) continue;
      selected.push(item);
      picked.add(item.main);
    }
  }

  /* 3. Добавляем группы в нужном порядке */
  push(newWords.sort(() => 0.5 - Math.random()), TOTAL_ROUNDS);
  push(errorWords.sort(() => 0.5 - Math.random()), TOTAL_ROUNDS);
  /* Циклическая выборка выученных */
  if (selected.length < TOTAL_ROUNDS && learnedWords.length) {
    const need = TOTAL_ROUNDS - selected.length;
    const startIdx = +localStorage.getItem('lastLearnedIndex') || 0;
    for (let i = 0; i < need; i++) {
      const word = learnedWords[(startIdx + i) % learnedWords.length];
      if (!picked.has(word.main)) {
        selected.push(word);
        picked.add(word.main);
      }
    }
    localStorage.setItem('lastLearnedIndex',
      (startIdx + need) % learnedWords.length);
  }

  /* 4. Резерв: случайные слова, если вдруг мало */
  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const backup = wordPairs.filter(p => !picked.has(p.main))
                            .sort(() => 0.5 - Math.random())
                            .slice(0, need);
    selected.push(...backup);
  }

  /* 5. Фиксируем, что показывали сегодня */
  const updatedUsed = usedMainToday.concat(selected.map(p => p.main));
  localStorage.setItem(`usedMain-${dateKey}`, JSON.stringify(updatedUsed));

  return selected.slice(0, TOTAL_ROUNDS);  // порядок сохранён
}

/* -------------------- UI-обновления -------------------- */
function updateHintDisplay() {
  document.getElementById('hintCount').textContent  = availableHints;
  document.getElementById('hintButton').disabled    = availableHints <= 0;
}
function updateCurrentScore() {
  document.getElementById('currentScore').textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
  document.getElementById('scoreEmojis').textContent  = '🏅'.repeat(starsEarned);
}

/* -------------------- Отрисовка слова -------------------- */
function displayWord() {
  const roundText = document.getElementById('roundNumber');
  roundText.textContent = `Round ${currentIndex + 1}`;
  roundText.classList.remove('fade-in'); void roundText.offsetWidth;
  roundText.classList.add('fade-in');

  const res = document.getElementById('result');
  res.textContent = '';
  res.classList.remove('correct', 'incorrect');
  statusImage.src = 'img/orange/neutral.svg';

  const main = shuffledPairs[currentIndex].main;
  wordStats[main] = wordStats[main] || { views: 0, correct: 0, errors: 0, correctInARow: 0 };
  wordStats[main].views++;
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  document.getElementById('mainWord').textContent = main;
  updateCurrentScore();
  generateOptions();
}

/* -------------------- Генерация кнопок вариантов -------------------- */
function generateOptions() {
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  const curr    = shuffledPairs[currentIndex];
  const correct = normalize(curr.correct);
  const opts    = [...curr.options].sort(() => 0.5 - Math.random());

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className     = 'option-button';
    btn.textContent   = opt;
    btn.dataset.correct = normalize(opt) === correct;
    btn.onclick       = () => selectOption(opt, btn);
    container.appendChild(btn);
  });
}

/* -------------------- Подсказка (обновлено) -------------------- */
function showHint() {
  if (availableHints <= 0) return;

  availableHints--;
  localStorage.setItem('availableHints', availableHints);
  updateHintDisplay();

  const buttons      = document.querySelectorAll('.option-button');
  const wrongButtons = [...buttons].filter(b => b.dataset.correct === 'false' && !b.disabled);

  if (wrongButtons.length === 0) return;

  /* ≤3 кнопок ⇒ скрыть 1; иначе ⇒ скрыть 2 */
  const removeCount = wrongButtons.length <= 3 ? 1 : 2;

  wrongButtons.sort(() => 0.5 - Math.random())
              .slice(0, removeCount)
              .forEach(b => {
                b.classList.add('faded');
                b.disabled = true;
              });
}

/* -------------------- Проверка ответа -------------------- */
function selectOption(selectedText, btn) {
  const correct   = shuffledPairs[currentIndex].correct;
  const main      = shuffledPairs[currentIndex].main;
  const res       = document.getElementById('result');
  const buttons   = document.querySelectorAll('.option-button');
  buttons.forEach(b => b.disabled = true);
  document.getElementById('hintButton').disabled = true;

  const isCorrect = normalize(selectedText) === normalize(correct);
  let delay;

  if (isCorrect) {
    scoreToday++;
    wordStats[main].correct++;
    wordStats[main].correctInARow = (wordStats[main].correctInARow || 0) + 1;
    if (wordStats[main].correctInARow >= 3) wordStats[main].errors = 0;

    res.textContent = 'Correct!';
    res.classList.add('correct');
    statusImage.src = 'img/orange/right.svg';
    btn.classList.add('correct');
    delay = 2000;
  } else {
    wordStats[main].errors++;
    wordStats[main].correctInARow = 0;

    res.textContent = `Incorrect. Answer: ${correct}`;
    res.classList.add('incorrect');
    statusImage.src = 'img/orange/wrong.svg';
    btn.classList.add('incorrect');

    const good = [...buttons].find(b => normalize(b.textContent) === normalize(correct));
    if (good) good.classList.add('correct');
    delay = 5000;
  }

  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  if (currentIndex < TOTAL_ROUNDS - 1) {
    currentIndex++;
    setTimeout(displayWord, delay);
  } else {
    setTimeout(endGame, delay);
  }
}

/* -------------------- Завершение игры -------------------- */
function endGame() {
  scoreHistory[dateKey] = scoreToday;
  localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

  const res = document.getElementById('result');
  res.classList.remove('correct', 'incorrect');

  if (scoreToday === TOTAL_ROUNDS) {
    statusImage.src = 'img/orange/winner.svg';
    starsEarned++;
    availableHints++;
    if (starsEarned >= 3) { availableHints += 10; starsEarned = 0; }

    res.textContent = `🏅 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  } else {
    statusImage.src = 'img/orange/looser.svg';
    res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  }

  localStorage.setItem('availableHints', availableHints);
  localStorage.setItem('starsEarned',   starsEarned);
  updateHintDisplay();
  updateCurrentScore();

  document.getElementById('restartContainer').innerHTML = `
    <br>
    <button class="restart-button blue-button" onclick="startGame()">Try Again (Same Words)</button>
    <button class="restart-button red-button"  onclick="restartWithNewWords()">New Game (New Words)</button>
    <button class="nextbutton" onclick="location.href='cards.html'">Next</button>
  `;
}

/* -------------------- Перезапуск -------------------- */
function startGame() {
  currentIndex = 0;
  scoreToday   = 0;
  document.getElementById('result').textContent = "Let's get started!";
  document.getElementById('restartContainer').innerHTML = '';
  updateHintDisplay();
  updateCurrentScore();
  displayWord();
}
function restartWithNewWords() {
  shuffledPairs = getShuffledPairs();
  startGame();
}

/* -------------------- Init -------------------- */
document.addEventListener('DOMContentLoaded', () => {
  updateHintDisplay();
  updateCurrentScore();
  displayWord();
});
