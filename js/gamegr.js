const statusImage = document.querySelector('.status-image');
const TOTAL_ROUNDS = 10;
const dateKey = new Date().toISOString().split('T')[0];
const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints = +localStorage.getItem('availableHints') || 0;
let starsEarned = +localStorage.getItem('starsEarned') || 0;
let wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');
let currentIndex = 0, scoreToday = 0;

let shuffledPairs = getShuffledPairs();

function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/['’]/g, '').trim();
}

function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');
  wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

  for (const key in wordStats) {
    const stats = wordStats[key];

    if (stats.correctInARow >= 3) {
      stats.errors = 0;
    }

    if (stats.views > 10 && stats.errors === 0) {
      delete wordStats[key];
    }
  }
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  const scored = wordPairs.map(pair => {
    const stats = wordStats[pair.main] || { views: 0, errors: 0 };
    const score = (stats.errors + 1) / (stats.views + 1);
    return { ...pair, _priority: score, _views: stats.views };
  });

  const newWords = scored.filter(p => p._views === 0 && !usedMainToday.includes(p.main));
  const errorWords = scored.filter(p => wordStats[p.main]?.errors > 0 && !usedMainToday.includes(p.main));
  const learnedWords = scored.filter(p =>
    !newWords.includes(p) &&
    !errorWords.includes(p) &&
    !usedMainToday.includes(p.main)
  );

  let selected = [];

  selected = selected.concat(newWords.slice(0, TOTAL_ROUNDS));

  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const topErrors = errorWords
      .sort((a, b) => b._priority - a._priority)
      .slice(0, 20)
      .sort(() => 0.5 - Math.random())
      .slice(0, need);
    selected = selected.concat(topErrors);
  }

  if (selected.length < TOTAL_ROUNDS) {
    const need = TOTAL_ROUNDS - selected.length;
    const fallback = learnedWords
      .sort(() => 0.5 - Math.random())
      .slice(0, need);
    selected = selected.concat(fallback);
  }

  if (selected.length < TOTAL_ROUNDS) {
    const backup = wordPairs
      .filter(p => !selected.includes(p))
      .sort(() => 0.5 - Math.random())
      .slice(0, TOTAL_ROUNDS - selected.length);
    selected = selected.concat(backup);
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

  const main = shuffledPairs[currentIndex].main;
  wordStats[main] = wordStats[main] || { views: 0, correct: 0, errors: 0, correctInARow: 0 };
  wordStats[main].views++;
  localStorage.setItem('wordStats', JSON.stringify(wordStats));

  document.getElementById('mainWord').textContent = main;
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
  const main = shuffledPairs[currentIndex].main;
  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');
  allButtons.forEach(b => b.disabled = true);
  document.getElementById('hintButton').disabled = true;

  let delay;
  if (normalize(selectedText) === normalize(correct)) {
    scoreToday++;
    wordStats[main].correct++;
    wordStats[main].correctInARow = (wordStats[main].correctInARow || 0) + 1;

    if (wordStats[main].correctInARow >= 3) {
      wordStats[main].errors = 0;
    }

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

    const correctBtn = [...allButtons].find(b => normalize(b.textContent) === normalize(correct));
    if (correctBtn) {
      correctBtn.classList.add('correct');
    }

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
    <button class="nextbutton" onclick="location.href='cards.html'">Next</button>
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
