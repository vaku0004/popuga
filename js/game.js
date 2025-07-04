const statusImage = document.querySelector('.status-image');
const TOTAL_ROUNDS = 10;
const dateKey = new Date().toISOString().split('T')[0];
const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints = +localStorage.getItem('availableHints') || 0;
let starsEarned = +localStorage.getItem('starsEarned') || 0;
let userWordStats = JSON.parse(localStorage.getItem('userWordStats') || '{}');
let currentIndex = 0, scoreToday = 0;

let shuffledPairs = getShuffledPairs();

function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/['’]/g, '').trim();
}

function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');

  // Загружаем и чистим статистику
  userWordStats = JSON.parse(localStorage.getItem('userWordStats') || '{}');
  for (const word in userWordStats) {
    const { views, errors } = userWordStats[word];
    if (views > 10 && errors === 0) {
      delete userWordStats[word];
    }
  }
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  // Присваиваем приоритеты
  const scoredPairs = wordPairs.map(pair => {
    const stats = userWordStats[pair.main] || { views: 0, errors: 0 };
    const score = (stats.errors + 1) / (stats.views + 1);
    return { ...pair, _priorityScore: score, views: stats.views };
  });

  const filtered = scoredPairs.filter(pair => !usedMainToday.includes(pair.main));

  if (filtered.length < TOTAL_ROUNDS) {
    localStorage.removeItem(`usedMain-${dateKey}`);
    return getShuffledPairs(); // сбрасываем usedMain и пробуем снова
  }

  // 1. Ошибочные слова
  const topErrorWords = filtered
    .filter(p => userWordStats[p.main] && userWordStats[p.main].errors > 0)
    .sort((a, b) => b._priorityScore - a._priorityScore)
    .slice(0, 20)
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  // 2. Слова с наименьшим числом просмотров
  const lowViewWords = filtered
    .filter(p => !topErrorWords.includes(p))
    .sort((a, b) => a.views - b.views)
    .slice(0, 50)
    .sort(() => 0.5 - Math.random());

  // 3. Если недостаточно — добираем оставшиеся любые слова
  const needed = TOTAL_ROUNDS - topErrorWords.length;
  let selected = [...topErrorWords, ...lowViewWords.slice(0, needed)];

  if (selected.length < TOTAL_ROUNDS) {
    const fallback = filtered
      .filter(p => !selected.includes(p))
      .sort(() => 0.5 - Math.random())
      .slice(0, TOTAL_ROUNDS - selected.length);
    selected = [...selected, ...fallback];
  }

  selected = selected.slice(0, TOTAL_ROUNDS).sort(() => 0.5 - Math.random());

  const updatedUsed = usedMainToday.concat(selected.map(p => p.main));
  localStorage.setItem(`usedMain-${dateKey}`, JSON.stringify(updatedUsed));

  return selected;
}


function updateHintDisplay() {
  document.getElementById('hintCount').textContent = availableHints;
  document.getElementById('hintButton').disabled = availableHints <= 0;
}

function updateCurrentScore() {
  document.getElementById('currentScore').textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
  document.getElementById('scoreEmojis').textContent = '🏅'.repeat(starsEarned);
}

function displayWord() {
  const roundText = document.getElementById('roundNumber');
  roundText.textContent = `Round ${currentIndex + 1}`;
  roundText.classList.remove('fade-in');
  void roundText.offsetWidth;
  roundText.classList.add('fade-in');

  const res = document.getElementById('result');
  res.textContent = '';
  res.classList.remove('correct', 'incorrect');
  statusImage.src = 'img/orange/neutral.svg';

  const currentMain = shuffledPairs[currentIndex].main;
  if (!userWordStats[currentMain]) {
    userWordStats[currentMain] = { views: 0, correct: 0, errors: 0 };
  }
  userWordStats[currentMain].views++;
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  document.getElementById('mainWord').textContent = currentMain;
  updateCurrentScore();
  generateOptions();
}

function generateOptions() {
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  const current = shuffledPairs[currentIndex];
  const correct = normalize(current.correct);
  const options = [...current.options].sort(() => 0.5 - Math.random());

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-button';
    btn.textContent = opt;
    btn.dataset.correct = normalize(opt) === correct;
    btn.onclick = () => selectOption(opt, btn);
    container.appendChild(btn);
  });
}

function showHint() {
  if (availableHints > 0) {
    availableHints--;
    localStorage.setItem('availableHints', availableHints);
    updateHintDisplay();

    const buttons = document.querySelectorAll('.option-button');
    const wrongButtons = [...buttons].filter(btn => btn.dataset.correct === 'false');
    const toFade = wrongButtons.sort(() => 0.5 - Math.random()).slice(0, 2);
    toFade.forEach(btn => {
      btn.classList.add('faded');
      btn.disabled = true;
    });
  }
}

function selectOption(selectedText, btn) {
  const correct = shuffledPairs[currentIndex].correct;
  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');
  allButtons.forEach(b => b.disabled = true);
  document.getElementById('hintButton').disabled = true;

  const currentMain = shuffledPairs[currentIndex].main;
  const isCorrect = normalize(selectedText) === normalize(correct);
  let delay;

  if (isCorrect) {
    scoreToday++;
    userWordStats[currentMain].correct++;
    res.textContent = 'Correct!';
    res.classList.add('correct');
    statusImage.src = 'img/orange/right.svg';
    btn.classList.add('correct');
    delay = 2000;
  } else {
    userWordStats[currentMain].errors++;
    res.textContent = `Incorrect. Answer: ${correct}`;
    res.classList.add('incorrect');
    statusImage.src = 'img/orange/wrong.svg';
    btn.classList.add('incorrect');

    const correctBtn = [...allButtons].find(b => normalize(b.textContent) === normalize(correct));
    if (correctBtn) {
      correctBtn.classList.add('correct');
    }

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

function endGame() {
  scoreHistory[dateKey] = scoreToday;
  localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

  const res = document.getElementById('result');
  res.classList.remove('correct', 'incorrect');

  if (scoreToday === TOTAL_ROUNDS) {
    statusImage.src = 'img/orange/winner.svg';
    starsEarned++;
    availableHints++;

    if (starsEarned >= 3) {
      availableHints += 10;
      starsEarned = 0;
    }

    res.textContent = `🏅 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  } else {
    statusImage.src = 'img/orange/looser.svg';
    res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
  }

  localStorage.setItem('availableHints', availableHints);
  localStorage.setItem('starsEarned', starsEarned);
  updateHintDisplay();
  updateCurrentScore();

  document.getElementById('restartContainer').innerHTML = `
    <br>
    <button class="restart-button blue-button" onclick="startGame()">Try Again (Same Words)</button>
    <button class="restart-button red-button" onclick="restartWithNewWords()">New Game (New Words)</button>
    <button class="nextbutton" onclick="location.href='mistakes.html'">Next</button>
  `;
}

function startGame() {
  currentIndex = 0;
  scoreToday = 0;
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

document.addEventListener('DOMContentLoaded', () => {
  updateHintDisplay();
  updateCurrentScore();
  displayWord();
});
