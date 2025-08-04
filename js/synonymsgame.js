
  let shuffledPairs = [];
  const TOTAL_ROUNDS = 10;
  const statusImage = document.querySelector('.status-image');
  let currentIndex = 0, scoreToday = 0, usedHintsThisWord = 0;
  let availableHints = +localStorage.getItem('availableHints') || 0;
  let starsEarned = +localStorage.getItem('starsEarned') || 0;
  const dateKey = new Date().toISOString().split('T')[0];
  const scoreHistory = JSON.parse(localStorage.getItem('synonymScores') || '{}');

  function shuffle(array) {
    let m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  }

  function updateHintDisplay() {
    document.getElementById('hintCount').textContent = availableHints;
    document.getElementById('hintButton').disabled = availableHints <= 0;
  }

  function updateCurrentScore() {
    document.getElementById('currentScore').textContent = `${scoreToday}/${TOTAL_ROUNDS}`;
    document.getElementById('scoreEmojis').textContent = '🏆'.repeat(starsEarned);
  }

  function updateHiddenWord() {
    const container = document.getElementById('hiddenWord');
    container.innerHTML = '';
    const synonym = shuffledPairs[currentIndex].synonym;
    let reveal = usedHintsThisWord;
    const cw = container.clientWidth;
    const tb = document.createElement('div');
    tb.className = 'letter-box';
    tb.style.visibility = 'hidden';
    tb.textContent = 'M';
    container.appendChild(tb);
    const bw = tb.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(container).columnGap) || 4;
    container.removeChild(tb);
    const maxPerLine = Math.max(2, Math.floor((cw + gap) / (bw + gap)));

    synonym.split(' ').forEach((word, wi) => {
      let chunks = [];
      for (let i = 0; i < word.length; i += maxPerLine) chunks.push(word.slice(i, i + maxPerLine));
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

  function displayWord() {
    usedHintsThisWord = 0;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    document.getElementById('userInput').value = '';
    document.getElementById('mainWord').textContent = shuffledPairs[currentIndex].main;
    document.getElementById('result').textContent = '';
    document.getElementById('result').classList.remove('correct', 'incorrect');
    statusImage.src = 'img/green/neutral.svg';

    const roundText = document.getElementById('roundNumber');
    roundText.textContent = `Round ${currentIndex + 1}`;
    roundText.classList.remove('fade-in');
    void roundText.offsetWidth;
    roundText.classList.add('fade-in');

    updateHiddenWord();
    updateCurrentScore();
  }

  function showHint() {
    if (availableHints > 0) {
      usedHintsThisWord++;
      availableHints--;
      localStorage.setItem('availableHints', availableHints);
      updateHintDisplay();
      updateHiddenWord();
    }
  }

  function checkAnswer() {
    const input = document.getElementById('userInput').value.trim().toLowerCase();
    const correct = shuffledPairs[currentIndex].synonym.toLowerCase();
    const res = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    res.classList.remove('correct', 'incorrect');

    let delay;
    const isCorrect = input === correct;
    if (isCorrect) {
      scoreToday++;
      availableHints++;
      res.textContent = 'Correct!';
      res.classList.add('correct');
      statusImage.src = 'img/green/right.svg';
      delay = 2000;
    } else {
      availableHints = Math.max(0, availableHints - 1);
      res.textContent = `Incorrect. Answer: ${correct}`;
      res.classList.add('incorrect');
      statusImage.src = 'img/green/wrong.svg';
      delay = 5000;
    }

    updateWordStats(isCorrect);
    submitBtn.disabled = true;
    localStorage.setItem('availableHints', availableHints);
    updateHintDisplay();

    if (currentIndex < TOTAL_ROUNDS - 1) {
      currentIndex++;
      setTimeout(displayWord, delay);
    } else {
      setTimeout(endGame, delay);
    }
  }

  function updateWordStats(isCorrect) {
    const word = shuffledPairs[currentIndex].main;
    const stats = JSON.parse(localStorage.getItem('wordStats') || '{}');
    stats[word] = stats[word] || { views: 0, errors: 0, correctInARow: 0 };
    stats[word].views++;

    if (isCorrect) {
      stats[word].correctInARow++;
      if (stats[word].correctInARow >= 3) {
        stats[word].errors = 0;
      }
    } else {
      stats[word].errors++;
      stats[word].correctInARow = 0;
    }

    localStorage.setItem('wordStats', JSON.stringify(stats));
  }

  function endGame() {
    scoreHistory[dateKey] = scoreToday;
    localStorage.setItem('synonymScores', JSON.stringify(scoreHistory));

    const res = document.getElementById('result');
    res.classList.remove('correct', 'incorrect');

    if (scoreToday === TOTAL_ROUNDS) {
      statusImage.src = 'img/green/winner.svg';
      starsEarned++;
      if (starsEarned >= 3) {
        availableHints += 10;
        starsEarned = 0;
      }
      localStorage.setItem('availableHints', availableHints);
      localStorage.setItem('starsEarned', starsEarned);
      res.textContent = `🏆 Congratulations! You won! Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
    } else {
      statusImage.src = 'img/green/loser.svg';
      res.textContent = `Keep practicing to win next time. Your score: ${scoreToday}/${TOTAL_ROUNDS}.`;
    }

    document.getElementById('submitBtn').disabled = true;
    updateHintDisplay();
    updateCurrentScore();
    document.getElementById('restartContainer').innerHTML = `
      <br>
      <button class="restart-button blue-button" onclick="startGame()">Try Again</button>
      <button class="restart-button red-button" onclick="restartWithNewWords()">New Game</button>
      <button class="nextbutton" onclick="location.href='spelling.html'">Next</button>
    `;
  }

  function getAdaptiveShuffledPairs() {
    const wordStats = JSON.parse(localStorage.getItem('wordStats') || '{}');

    const scored = wordPairs.map(pair => {
      const stats = wordStats[pair.main] || { views: 0, errors: 0, correctInARow: 0 };

      let priority;
      if (stats.views < 3) {
        priority = 1; // Новые слова
      } else if (stats.errors > 0) {
        priority = 2; // Ошибочные слова
      } else {
        priority = 3; // Остальные — в конце
      }

      return {
        ...pair,
        _priority: priority,
        _views: stats.views
      };
    });

    const newWords = scored.filter(p => p._priority === 1);
    const errorWords = scored.filter(p => p._priority === 2);
    const knownWords = scored.filter(p => p._priority === 3);

    shuffle(newWords);
    shuffle(errorWords);
    shuffle(knownWords);

    const combined = [...newWords, ...errorWords, ...knownWords];
    return combined.slice(0, TOTAL_ROUNDS);
  }

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
    document.getElementById('result').textContent = "Let's get started!";
    document.getElementById('restartContainer').innerHTML = '';
    updateHintDisplay();
    updateCurrentScore();
    displayWord();
    document.getElementById('userInput').focus();
  }

  document.getElementById('userInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') checkAnswer();
  });

  document.addEventListener('DOMContentLoaded', () => {
    restartWithNewWords();
  });
