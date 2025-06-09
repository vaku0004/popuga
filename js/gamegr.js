const statusImage = document.querySelector('.status-image');
const TOTAL_ROUNDS = 10;
const dateKey = new Date().toISOString().split('T')[0];
const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');
let availableHints = +localStorage.getItem('availableHints') || 0;
let starsEarned = +localStorage.getItem('starsEarned') || 0;
let currentIndex = 0, scoreToday = 0;

let shuffledPairs = getShuffledPairs();

function getShuffledPairs() {
  const usedMainToday = JSON.parse(localStorage.getItem(`usedMain-${dateKey}`) || '[]');
  const unusedPairs = wordPairs.filter(pair => !usedMainToday.includes(pair.main));
  if (unusedPairs.length < TOTAL_ROUNDS) {
    localStorage.removeItem(`usedMain-${dateKey}`);
    return getShuffledPairs();
  }

  const array = [...unusedPairs];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  const selected = array.slice(0, TOTAL_ROUNDS);

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

  document.getElementById('mainWord').textContent = shuffledPairs[currentIndex].main;
  updateCurrentScore();
  generateOptions();
}

function generateOptions() {
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  const current = shuffledPairs[currentIndex];
  const correct = current.correct.toLowerCase();
  const options = [...current.options].sort(() => 0.5 - Math.random());

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-button';
    btn.textContent = opt;
    btn.dataset.correct = opt === correct;
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
  const correct = shuffledPairs[currentIndex].correct.toLowerCase();
  const res = document.getElementById('result');
  const allButtons = document.querySelectorAll('.option-button');
  allButtons.forEach(b => b.disabled = true);
  document.getElementById('hintButton').disabled = true;

  let delay;
  if (selectedText === correct) {
    scoreToday++;
    res.textContent = 'Correct!';
    res.classList.add('correct');
    statusImage.src = 'img/orange/right.svg';
    btn.classList.add('correct');
    delay = 2000;
  } else {
    res.textContent = `Incorrect. Answer: ${correct}`;
    res.classList.add('incorrect');
    statusImage.src = 'img/orange/wrong.svg';
    btn.classList.add('incorrect');

    const correctBtn = [...allButtons].find(b => b.textContent.trim().toLowerCase() === correct);
    if (correctBtn) {
      correctBtn.classList.add('correct');
    }

    delay = 5000;
  }

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
    availableHints++; // ✅ +1 подсказка за идеальную игру

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
