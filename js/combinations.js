// ======== Константы и состояние ========
let shuffledPairs = [];
const TOTAL_ROUNDS = 10;

let currentIndex = 0, scoreToday = 0, usedHintsThisWord = 0;
let sessionStreak = 0; // серия верных ответов в текущей сессии

const dateKey = new Date().toISOString().split('T')[0];
const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');

let availableHints = +localStorage.getItem('availableHints') || 0;
let starsEarned    = +localStorage.getItem('starsEarned') || 0;

// UI-узлы кэшируем после DOMContentLoaded
const UI = {
  statusImage: null,
  hintCount: null,
  hintButton: null,
  currentScore: null,
  scoreEmojis: null,
  hiddenWord: null,        // тут отрисуем "банк" токенов и "ответ"
  submitBtn: null,
  userInput: null,         // оставляем, но скрывать/не использовать — по желанию
  mainWord: null,
  result: null,
  roundNumber: null,
  restartContainer: null,
  hiddenWordResizeObs: null,
};

// Рабочее состояние для текущего раунда (токены)
let tokenBank = [];   // [{id, text}]
let tokenAnswer = []; // массив id в порядке пользователя
let correctTokens = [];

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

function norm(s){ return s.replace(/\s+/g,' ').trim().toLowerCase(); }

// ======== Генерация токенов для раунда ========
function sentenceToTokens(sentence) {
  // Простой сплит по пробелам; при желании можно умнее: сохранять знаки препинания отдельными токенами
  return sentence.split(/\s+/).filter(Boolean);
}

function buildRoundTokens(correctSentence, optionalScrambled) {
  const base = sentenceToTokens(correctSentence);
  correctTokens = base.slice(); // эталон
  let scrambled = optionalScrambled ? sentenceToTokens(optionalScrambled) : base.slice();
  // Перемешаем до отличия от правильного порядка
  let tries = 0;
  while (tries < 20 && scrambled.every((w, i) => w === base[i]) && base.length > 1) {
    shuffle(scrambled);
    tries++;
  }
  // упакуем в объекты с id
  const uid = () => Math.random().toString(36).slice(2,9);
  tokenBank = scrambled.map(w => ({ id: uid(), text: w }));
  tokenAnswer = []; // пустой ответ
}

// ======== Рендер банка и ответа ========
function renderTokens() {
  if (!UI.hiddenWord) return;

  UI.hiddenWord.innerHTML = '';

  // контейнеры
  const bank = document.createElement('div');
  bank.id = 'tokenBank';
  bank.className = 'token-bank';

  const answer = document.createElement('div');
  answer.id = 'tokenAnswer';
  answer.className = 'token-answer';

  // заголовки (необязательно)
  const bankTitle = document.createElement('div');
  bankTitle.className = 'token-title';
  bankTitle.textContent = 'Words';
  const answerTitle = document.createElement('div');
  answerTitle.className = 'token-title';
  answerTitle.textContent = 'Your sentence';

  // токены банка
  const usedIds = new Set(tokenAnswer);
  tokenBank.forEach(tok => {
    if (usedIds.has(tok.id)) return; // уже использован в ответе
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'token-chip';
    chip.textContent = tok.text;
    chip.addEventListener('click', () => moveTokenToAnswer(tok.id));
    bank.appendChild(chip);
  });

  // токены ответа
  tokenAnswer.forEach(id => {
    const tok = tokenBank.find(t => t.id === id);
    if (!tok) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'token-chip selected';
    chip.textContent = tok.text;
    chip.title = 'Click to remove';
    chip.addEventListener('click', () => removeTokenFromAnswer(id));
    answer.appendChild(chip);
  });

  UI.hiddenWord.appendChild(bankTitle);
  UI.hiddenWord.appendChild(bank);
  UI.hiddenWord.appendChild(answerTitle);
  UI.hiddenWord.appendChild(answer);
}

function moveTokenToAnswer(id) {
  if (!tokenAnswer.includes(id)) {
    tokenAnswer.push(id);
    renderTokens();
  }
}

function removeTokenFromAnswer(id) {
  tokenAnswer = tokenAnswer.filter(x => x !== id);
  renderTokens();
}

// ======== Отрисовка раунда ========
function displayWord() {
  if (!shuffledPairs.length) return;

  usedHintsThisWord = 0;

  if (UI.submitBtn) UI.submitBtn.disabled = false;
  if (UI.userInput) { UI.userInput.value = ''; } // не используем, просто очищаем
  if (UI.mainWord)  UI.mainWord.textContent = shuffledPairs[currentIndex].main || 'Arrange the words';

  if (UI.result) {
    UI.result.textContent = '';
    UI.result.classList.remove('correct', 'incorrect');
  }

  setStatus('img/green/neutral.svg');

  if (UI.roundNumber) {
    UI.roundNumber.textContent = `Round ${currentIndex + 1}`;
    UI.roundNumber.classList.remove('fade-in');
    void UI.roundNumber.offsetWidth;
    UI.roundNumber.classList.add('fade-in');
  }

  // подготовка токенов для текущего предложения
  const pair = shuffledPairs[currentIndex];
  const correct = pair.correct;
  const scrambled = pair.scrambled; // опционально (если хочешь задавать руками)
  buildRoundTokens(correct, scrambled);

  // рендер
  renderTokens();
  updateCurrentScore();
}

// ======== Подсказка: переносит следующее правильное слово ========
function showHint() {
  if (availableHints <= 0) return;

  const pair = shuffledPairs[currentIndex];
  const target = correctTokens;

  // определяем следующую правильную позицию
  const currentBuilt = tokenAnswer.map(id => {
    const t = tokenBank.find(x => x.id === id);
    return t ? t.text : '';
  });

  // уже правильно собранная префиксная часть?
  let nextIndex = currentBuilt.length; // позиция следующего слова
  if (nextIndex >= target.length) return; // всё уже собрано

  const neededWord = target[nextIndex]; // следующее слово, которое должно быть
  // найдём его id в банке
  const candidate = tokenBank.find(t => t.text.toLowerCase() === neededWord.toLowerCase() && !tokenAnswer.includes(t.id));
  if (candidate) {
    usedHintsThisWord++;
    availableHints--;
    tokenAnswer.push(candidate.id);
    localStorage.setItem('availableHints', availableHints);
    updateHintDisplay();
    renderTokens();
  }
}

// ======== Проверка ответа (+ бонус за серию) ========
function checkAnswer() {
  if (!UI.submitBtn || UI.submitBtn.disabled) return; // анти-дабл
  if (!shuffledPairs.length) return;

  const res = UI.result;

  const userSentence = tokenAnswer.map(id => {
    const t = tokenBank.find(x => x.id === id);
    return t ? t.text : '';
  }).join(' ').trim();

  const pair = shuffledPairs[currentIndex];
  const correct = pair.correct;
  const alts = Array.isArray(pair.alts) ? pair.alts : [];

  const isCorrect =
    norm(userSentence) === norm(correct) ||
    alts.some(a => norm(a) === norm(userSentence));

  res?.classList.remove('correct', 'incorrect');

  let delay;
  if (isCorrect) {
    scoreToday++;
    availableHints++;       // базовый бонус за правильный
    sessionStreak++;        // серия

    if (sessionStreak % 3 === 0) {
      availableHints += 2;  // +2 за каждые 3 подряд
    }

    if (res) { res.textContent = 'Correct!'; res.classList.add('correct'); }
    setStatus('img/green/right.svg');
    delay = 2000;
  } else {
    sessionStreak = 0;
    availableHints = Math.max(0, availableHints - 1);
    if (res) {
      const show = correct;
      res.textContent = `Incorrect. Answer: ${show}`;
      res.classList.add('incorrect');
    }
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

// ======== Статистика слов (по ключу main) ========
function updateWordStats(isCorrect) {
  const pair = shuffledPairs[currentIndex];
  if (!pair) return;

  const word = pair.main; // ключ статистики — заголовок задания
  const stats = JSON.parse(localStorage.getItem('wordStats') || '{}');
  stats[word] = stats[word] || { views: 0, errors: 0, correctInARow: 0 };
  stats[word].views++;

  if (isCorrect) {
    stats[word].correctInARow++;
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

// ======== Приоритизация заданий: новые → проблемные → освоенные (для добора) ========
function getAdaptiveShuffledPairs() {
  if (typeof wordPairs === 'undefined' || !Array.isArray(wordPairs) || wordPairs.length === 0) {
    console.warn('wordPairs не определён или пуст.');
    return [];
  }

  const wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

  const tagged = wordPairs.map(pair => {
    const key = pair.main;
    const s = wordStats[key] || { views: 0, errors: 0, correctInARow: 0 };
    const isNew = s.views < 3;
    const isProblem = s.errors > 0;
    const isMastered = !isNew && !isProblem;
    return { ...pair, _views: s.views, _isNew: isNew, _isProblem: isProblem, _isMastered: isMastered };
  });

  const newItems      = tagged.filter(p => p._isNew);
  const problemItems  = tagged.filter(p => p._isProblem);
  const masteredItems = tagged.filter(p => p._isMastered);

  shuffle(newItems);
  shuffle(problemItems);
  shuffle(masteredItems);

  let combined = [...newItems, ...problemItems];
  if (combined.length < TOTAL_ROUNDS) combined = combined.concat(masteredItems);

  return combined.slice(0, TOTAL_ROUNDS);
}

// ======== Перезапуск и старт ========
function restartWithNewWords() {
  shuffledPairs = getAdaptiveShuffledPairs();
  startGame();
}

function startGame() {
  if (!shuffledPairs.length) shuffledPairs = getAdaptiveShuffledPairs();

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

// ======== Инициализация ========
document.addEventListener('DOMContentLoaded', () => {
  UI.statusImage      = document.querySelector('.status-image');
  UI.hintCount        = document.getElementById('hintCount');
  UI.hintButton       = document.getElementById('hintButton');
  UI.currentScore     = document.getElementById('currentScore');
  UI.scoreEmojis      = document.getElementById('scoreEmojis');
  UI.hiddenWord       = document.getElementById('hiddenWord');
  UI.submitBtn        = document.getElementById('submitBtn');
  UI.userInput        = document.getElementById('userInput'); // можно скрыть в верстке
  UI.mainWord         = document.getElementById('mainWord');
  UI.result           = document.getElementById('result');
  UI.roundNumber      = document.getElementById('roundNumber');
  UI.restartContainer = document.getElementById('restartContainer');

  if (UI.result && !UI.result.hasAttribute('aria-live')) {
    UI.result.setAttribute('aria-live', 'polite');
  }

  UI.submitBtn && UI.submitBtn.addEventListener('click', checkAnswer);
  UI.hintButton && UI.hintButton.addEventListener('click', showHint);

  // Поддержка resize для обтекания (если нужно, можно удалить)
  if (UI.hiddenWord && 'ResizeObserver' in window) {
    UI.hiddenWordResizeObs = new ResizeObserver(() => renderTokens());
    UI.hiddenWordResizeObs.observe(UI.hiddenWord);
  } else {
    window.addEventListener('resize', renderTokens);
  }

  restartWithNewWords();
});
