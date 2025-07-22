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
  userWordStats = JSON.parse(localStorage.getItem('userWordStats') || '{}');

  // Обновляем статистику: сбрасываем ошибки, если исправлены
  for (const word in userWordStats) {
    const stats = userWordStats[word];
    if (stats.correctInARow >= 3) {
      stats.errors = 0;
    }

    if (stats.views > 10 && stats.errors === 0) {
      delete userWordStats[word]; // освоенные
    }
  }
  localStorage.setItem('userWordStats', JSON.stringify(userWordStats));

  const scoredPairs = wordPairs.map(pair => {
    const stats = userWordStats[pair.main] || { views: 0, errors: 0 };
    const score = (stats.errors + 1) / (stats.views + 1);
    return { ...pair, _priorityScore: score, views: stats.views };
  });

  const newWords = scoredPairs.filter(p => p.views === 0);
  const errorWords = scoredPairs.filter(p =>
    userWordStats[p.main] && userWordStats[p.main].errors > 0
  );
  const learnedWords = scoredPairs.filter(p =>
    !newWords.includes(p) && !errorWords.includes(p)
  );

  let selected = [];

  // Новые слова
  const newWordsFiltered = newWords.filter(p => !usedMainToday.includes(p.main));
  selected = selected.concat(newWordsFiltered.slice(0, TOTAL_ROUNDS));

  // Ошибочные слова
  if (selected.length < TOTAL_ROUNDS) {
    const needed = TOTAL_ROUNDS - selected.length;
    const topErrors = errorWords
      .filter(p => !usedMainToday.includes(p.main))
      .sort((a, b) => b._priorityScore - a._priorityScore)
      .slice(0, 20)
      .sort(() => 0.5 - Math.random())
      .slice(0, needed);
    selected = selected.concat(topErrors);
  }

  // Освоенные слова (циклично)
  if (selected.length < TOTAL_ROUNDS) {
    const needed = TOTAL_ROUNDS - selected.length;
    const fallback = learnedWords
      .filter(p => !selected.includes(p))
      .sort(() => 0.5 - Math.random())
      .slice(0, needed);
    selected = selected.concat(fallback);
  }

  // Если всё ещё не хватает — позволяем повторение использованных
  if (selected.length < TOTAL_ROUNDS) {
    const all = wordPairs
      .filter(p => !selected.includes(p))
      .sort(() => 0.5 - Math.random())
      .slice(0, TOTAL_ROUNDS - selected.length);
    selected = selected.concat(all);
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
    userWordStats[currentMain] = { views: 0, correct: 0, errors: 0, correctInARow: 0 };
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
    userWordStats[currentMain].correctInARow = (userWordStats[currentMain].correctInARow || 0) + 1;

    if (userWordStats[currentMain].correctInARow >= 3) {
      userWordStats[currentMain].errors = 0;
    }

    res.textContent = 'Correct!';
    res.classList.add('correct');
    statusImage.src = 'img/orange/right.svg';
    btn.classList.add('correct');
    delay = 2000;
  } else {
    userWordStats[currentMain].errors++;
    userWordStats[currentMain].correctInARow = 0;

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
