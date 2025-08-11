// ======== Константы и состояние ========
let shuffledPairs = [];
const TOTAL_ROUNDS = 10;
let currentIndex = 0, scoreToday = 0, usedHintsThisWord = 0;
let sessionStreak = 0; // серия верных ответов в текущей сессии

const dateKey = new Date().toISOString().split('T')[0];
const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');

let availableHints = +localStorage.getItem('availableHints') || 0;
let starsEarned    = +localStorage.getItem('starsEarned') || 0;

// Узлы UI кэшируем после DOMContentLoaded
const UI = {
  statusImage: null,
  hintCount: null,
  hintButton: null,
  currentScore: null,
  scoreEmojis: null,
  hiddenWord: null,
  submitBtn: null,
  userInput: null,
  mainWord: null,
  result: null,
  roundNumber: null,
  restartContainer: null,
  hiddenWordResizeObs: null,
};

// ======== Утилиты ========
function shuffle(array) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m]; array[m] = array[i]; array[i] = t;
  }
  return array;
}

function setStatus(src) {
  if (UI.statusImage) UI.statusImage.src = src;
}

function updateHintDisplay() {
  if (UI.hintCount) UI.hintCount.textContent = availableHints;
  if (UI.hintButton) UI.hintButton.disabled = availableHints <= 0;
}

function updateCurrentScore() {
  if (UI.currentScore) UI.currentScore.textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
  if (UI.scoreEmojis) UI.scoreEmojis.textContent = '🏆'.repeat(starsEarned);
}

// ======== Отрисовка скрытого слова ========
function updateHiddenWord() {
  if (!UI.hiddenWord || !shuffledPairs.length) return;

  const container = UI.hiddenWord;
  container.innerHTML = '';

  const pair = shuffledPairs[currentIndex];
  if (!pair) return;
  const synonym = pair.synonym;

  let reveal = usedHintsThisWord;

  // измеряем базовую ширину буквы
  const testBox = document.createElement('div');
  testBox.className = 'letter-box';
  testBox.style.visibility = 'hidden';
  testBox.textContent = 'M';
  container.appendChild(testBox);
  const bw = testBox.getBoundingClientRect().width || 10;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 4;
  container.removeChild(testBox);

  const cw = container.clientWidth || 0;
  const maxPerLine = Math.max(2, Math.floor((cw + gap) / (bw + gap)));

  synonym.split(' ').forEach((word, wi) => {
    let chunks = [];
    for (let i = 0; i < word.length; i += maxPerLine) {
      chunks.push(word.slice(i, i + maxPerLine));
    }
    // избегаем одиноких символов в конце
    if (chunks.length > 1 && chunks[chunks.length - 1].length < 2) {
      const last = chunks.pop(), prev = chunks.pop();
      const need = 2 - last.length;
      const newPrev = prev.slice(0, prev.length - need);
      const newLast = prev.slice(prev.length - need) + last;
      if (newPrev) chunks.push(newPrev);
      chunks.push(newLast);
    }

    chunks.forEach(chunk => {
      const grp = document.createElement('div');
      grp.className = 'word-group';
      [...chunk].forEach(ch => {
        const box = document.createElement('div');
        box.className = `letter-box word-color-${wi % 6}`;
        if (ch === '-') {
          box.textContent = '-';
          box.classList.add('filled-box');
        } else if (reveal-- > 0) {
          box.textContent = ch.toUpperCase();
          box.classList.add('filled-box');
        }
        grp.appendChild(box);
      });
      container.appendChild(grp);
    });

    const sp = document.createElement('div');
    sp.className = 'space-box';
    container.appendChild(sp);
  });
}

// ======== Показ слова раунда ========
function displayWord() {
  if (!shuffledPairs.length) return;

  usedHintsThisWord = 0;

  if (UI.submitBtn) UI.submitBtn.disabled = false;
  if (UI.userInput) {
    UI.userInput.value = '';
    UI.userInput.focus();
  }

  if (UI.mainWord) UI.mainWord.textContent = shuffledPairs[currentIndex].main;

  if (UI.result) {
    UI.result.textContent = '';
    UI.result.classList.remove('correct', 'incorrect');
  }

  setStatus('img/green/neutral.svg');

  if (UI.roundNumber) {
    UI.roundNumber.textContent = `Round ${currentIndex + 1}`;
    UI.roundNumber.classList.remove('fade-in');
    void UI.roundNumber.offsetWidth; // перезапуск анимации
    UI.roundNumber.classList.add('fade-in');
  }

  // Перенесли на следующий кадр, чтобы размеры были точные
  requestAnimationFrame(updateHiddenWord);
  updateCurrentScore();
}

// ======== Подсказки ========
function showHint() {
  if (availableHints > 0) {
    usedHintsThisWord++;
    availableHints--;
    localStorage.setItem('availableHints', availableHints);
    updateHintDisplay();
    updateHiddenWord();
  }
}

// ======== Проверка ответа (+ бонус за серию) ========
function checkAnswer() {
  if (!UI.submitBtn || UI.submitBtn.disabled) return; // анти-дабл

  const input = (UI.userInput?.value || '').trim().toLowerCase();
  const correct = (shuffledPairs[currentIndex]?.synonym || '').toLowerCase();
  const res = UI.result;

  res?.classList.remove('correct', 'incorrect');

  let delay;
  const isCorrect = input === correct;

  if (isCorrect) {
    scoreToday++;
    availableHints++;       // базовый бонус за правильный
    sessionStreak++;        // считаем серию

    // Каждые 3 подряд: +2 подсказки
    if (sessionStreak % 3 === 0) {
      availableHints += 2;
      // Можно показать мини-тост пользователю, если есть где:
      // res && (res.textContent = 'Correct! (+2 hints for 3-in-a-row!)');
    }

    if (res) { res.textContent = 'Correct!'; res.classList.add('correct'); }
    setStatus('img/green/right.svg');
    delay = 2000;
  } else {
    sessionStreak = 0; // сброс серии
    availableHints = Math.max(0, availableHints - 1);
    if (res) { res.textContent = `Incorrect. Answer: ${correct}`; res.classList.add('incorrect'); }
    setStatus('img/green/wrong.svg');
    delay = 5000;
  }

  updateWordStats(isCorrect);

  UI.submitBtn.disabled = true;
  localStorage.setItem('availableHints', availableHints);
  updateHintDisplay();

  if (currentIndex < TOTAL_ROUNDS - 1) {
    currentIndex++;
    setTimeout(displayWord, delay);
  } else {
    setTimeout(endGame, delay);
  }
}

// ======== Обновление статистики слов ========
function updateWordStats(isCorrect) {
  const pair = shuffledPairs[currentIndex];
  if (!pair) return;

  const word = pair.main;
  const stats = JSON.parse(localStorage.getItem('wordStats') || '{}');
  stats[word] = stats[word] || { views: 0, errors: 0, correctInARow: 0 };
  stats[word].views++;

  if (isCorrect) {
    stats[word].correctInARow++;
    // Если 3 подряд — слово перестаёт быть проблемным
    if (stats[word].correctInARow >= 3) {
      stats[word].errors = 0; // «освоенное»
    }
  } else {
    stats[word].errors++;
    stats[word].correctInARow = 0;
  }

  localStorage.setItem('wordStats', JSON.stringify(stats));
}

// ======== Завершение игры ========
function endGame() {
  scoreHistory[dateKey] = scoreToday;
  localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

  const res = UI.result;
  res?.classList.remove('correct', 'incorrect');

  if (scoreToday === TOTAL_ROUNDS) {
    setStatus('img/green/winner.svg');
    starsEarned++;
    if (starsEarned >= 3) {
      availableHints += 10;
      starsEarned = 0;
    }
    localStorage.setItem('availableHints', availableHints);
    localStorage.setItem('starsEarned', starsEarned);
    if (res) res.textContent = `🏆 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  } else {
    setStatus('img/green/loser.svg');
    if (res) res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  }

  UI.submitBtn && (UI.submitBtn.disabled = true);
  updateHintDisplay();
  updateCurrentScore();

  if (UI.restartContainer) {
    UI.restartContainer.innerHTML = `
      <br>
      <button class="restart-button blue-button" onclick="startGame()">Try Again</button>
      <button class="restart-button red-button" onclick="restartWithNewWords()">New Game</button>
      <button class="nextbutton" onclick="location.href='spelling.html'">Next</button>
    `;
  }
}

// ======== Приоритизация слов: новые → проблемные → освоенные (для добора) ========
function getAdaptiveShuffledPairs() {
  // Проверка наличия wordPairs
  if (typeof wordPairs === 'undefined' || !Array.isArray(wordPairs) || wordPairs.length === 0) {
    console.warn('wordPairs не определён или пуст.');
    return [];
  }

  const wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

  const tagged = wordPairs.map(pair => {
    const s = wordStats[pair.main] || { views: 0, errors: 0, correctInARow: 0 };
    const isNew = s.views < 3;
    const isProblem = s.errors > 0;          // проблемное пока есть ошибки
    const isMastered = !isNew && !isProblem; // освоенное: не новое и без ошибок
    return { ...pair, _views: s.views, _isNew: isNew, _isProblem: isProblem, _isMastered: isMastered };
  });

  const newWords      = tagged.filter(p => p._isNew);
  const problemWords  = tagged.filter(p => p._isProblem);
  const masteredWords = tagged.filter(p => p._isMastered);

  shuffle(newWords);
  shuffle(problemWords);
  shuffle(masteredWords);

  let combined = [...newWords, ...problemWords];
  if (combined.length < TOTAL_ROUNDS) {
    combined = combined.concat(masteredWords);
  }

  return combined.slice(0, TOTAL_ROUNDS);
}

// ======== Перезапуск и старт ========
function restartWithNewWords() {
  shuffledPairs = getAdaptiveShuffledPairs();
  startGame();
}

function startGame() {
  if (!shuffledPairs.length) {
    shuffledPairs = getAdaptiveShuffledPairs();
  }
  currentIndex = 0;
  scoreToday = 0;
  usedHintsThisWord = 0;
  sessionStreak = 0;

  if (UI.result) UI.result.textContent = "Let's get started!";
  if (UI.restartContainer) UI.restartContainer.innerHTML = '';

  updateHintDisplay();
  updateCurrentScore();
  displayWord();
}

// ======== Инициализация после загрузки DOM ========
document.addEventListener('DOMContentLoaded', () => {
  // Кэшируем узлы
  UI.statusImage      = document.querySelector('.status-image');
  UI.hintCount        = document.getElementById('hintCount');
  UI.hintButton       = document.getElementById('hintButton');
  UI.currentScore     = document.getElementById('currentScore');
  UI.scoreEmojis      = document.getElementById('scoreEmojis');
  UI.hiddenWord       = document.getElementById('hiddenWord');
  UI.submitBtn        = document.getElementById('submitBtn');
  UI.userInput        = document.getElementById('userInput');
  UI.mainWord         = document.getElementById('mainWord');
  UI.result           = document.getElementById('result');
  UI.roundNumber      = document.getElementById('roundNumber');
  UI.restartContainer = document.getElementById('restartContainer');

  // ARIA для озвучивания результата (если нет — не страшно)
  if (UI.result && !UI.result.hasAttribute('aria-live')) {
    UI.result.setAttribute('aria-live', 'polite');
  }

  // Обработчики
  UI.userInput && UI.userInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
      const v = e.currentTarget.value.trim();
      if (!v) { showHint(); return; } // Enter на пустом поле — даёт подсказку
      checkAnswer();
    }
  });

  UI.submitBtn && UI.submitBtn.addEventListener('click', checkAnswer);
  UI.hintButton && UI.hintButton.addEventListener('click', showHint);

  // Следим за изменением ширины контейнера скрытого слова
  if (UI.hiddenWord && 'ResizeObserver' in window) {
    UI.hiddenWordResizeObs = new ResizeObserver(() => updateHiddenWord());
    UI.hiddenWordResizeObs.observe(UI.hiddenWord);
  } else {
    window.addEventListener('resize', updateHiddenWord);
  }

  // Первый запуск
  restartWithNewWords();
});
