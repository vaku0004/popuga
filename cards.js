(() => {
  const imageNames = [
    "a puddle", "a saucer", "a well",
    "to clap", "to dunk", "to nudge",
    "to shrug", "to simmer", "to sip",
    "to stir", "to stroke someone",
    "to tickle someone", "to wink", "office premises"
  ];

  // DOM
  const imageColumn   = document.getElementById('imageColumn');
  const wordColumn    = document.getElementById('wordColumn');
  const instructionEl = document.querySelector('.instruction');
  const statusImage   = document.getElementById('statusImage');
  const scoreDisplay  = document.getElementById('currentScore');
  const hintButton    = document.getElementById('hintButton');
  const restartButton = document.getElementById('restartButton');

  // Save initial instruction text
  const initialInstructionText = instructionEl.firstChild.nodeValue.trim();

  // State from localStorage
  let availableHints = +localStorage.getItem('availableHints') || 0;
  let scoreHistory   = JSON.parse(localStorage.getItem('matchScores') || '{}');
  const dateKey      = new Date().toISOString().split('T')[0];

  // Game state
  let selectedElement = null;
  let correctMatches  = 0;
  let totalAttempts   = 0;
  const maxMatches    = 5;
  let selectedNames   = [];

  // Helpers
  function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }
  function updateScore() {
    scoreDisplay.textContent = `${correctMatches}/${maxMatches}`;
  }
  function updateHintButton() {
    hintButton.textContent = `Hint (${availableHints})`;
    hintButton.disabled = availableHints === 0;
  }

  // Create cards
  function createImageCard(name) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-item';
    wrapper.dataset.word = name;
    const img = document.createElement('img');
    img.src = `img/cards/${name}.png`;
    img.alt = name;
    wrapper.appendChild(img);
    wrapper.addEventListener('click', () => handleSelect(wrapper, name, 'image'));
    return wrapper;
  }
  function createWordCard(name) {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.word = name;
    div.textContent = name;
    div.addEventListener('click', () => handleSelect(div, name, 'word'));
    return div;
  }

  // Selection logic
  function handleSelect(element, word, type) {
    if (restartButton.style.display === 'inline-block') return;

    if (!selectedElement) {
      selectedElement = { element, word, type };
      element.classList.add('selected');
      return;
    }

    totalAttempts++;
    const isMatch = selectedElement.word === word && selectedElement.type !== type;
    const firstEl  = selectedElement.element;
    const secondEl = element;
    firstEl.classList.remove('selected');
    secondEl.classList.remove('selected');

    if (isMatch) {
      firstEl.classList.add('correct');
      secondEl.classList.add('correct');
      correctMatches++;
      setTimeout(() => {
        firstEl.remove();
        secondEl.remove();
        updateScore();
        if (correctMatches === maxMatches) {
          endGame(totalAttempts === correctMatches);
        }
      }, 300);
    } else {
      firstEl.classList.add('incorrect');
      secondEl.classList.add('incorrect');
      setTimeout(() => {
        firstEl.classList.remove('incorrect');
        secondEl.classList.remove('incorrect');
      }, 600);
    }

    selectedElement = null;
  }

  // Hint
  function showHint() {
    if (availableHints <= 0) return;
    const imgs  = document.querySelectorAll('.image-item');
    const words = document.querySelectorAll('.word-item');
    for (let img of imgs) {
      const w = img.dataset.word;
      const match = [...words].find(x => x.dataset.word === w);
      if (match) {
        img.classList.add('hinted');
        match.classList.add('hinted');
        setTimeout(() => {
          img.classList.remove('hinted');
          match.classList.remove('hinted');
        }, 2000);
        availableHints--;
        localStorage.setItem('availableHints', availableHints);
        updateHintButton();
        break;
      }
    }
  }

  hintButton.addEventListener('click', showHint);

  // End game
  function endGame(won) {
    scoreHistory[dateKey] = { correct: correctMatches, attempts: totalAttempts };
    localStorage.setItem('matchScores', JSON.stringify(scoreHistory));
  
    statusImage.classList.add('large'); // добавляем увеличение
  
    if (won) {
      instructionEl.firstChild.nodeValue = `🎉 You are the winner! `;
      statusImage.src = 'img/green/winner.svg';
      availableHints++;
      localStorage.setItem('availableHints', availableHints);
    } else {
      instructionEl.firstChild.nodeValue = `Your score: ${correctMatches}/${totalAttempts}. `;
      statusImage.src = 'img/green/loser.svg';
    }
  
    restartButton.textContent = won ? 'Play Again' : 'Try Again';
    restartButton.style.display = 'inline-block';
    updateHintButton();
  }
  

  // Init / restart
  function initGame() {
    imageColumn.innerHTML = '';
    wordColumn.innerHTML  = '';
    correctMatches        = 0;
    totalAttempts         = 0;
    selectedElement       = null;
    instructionEl.firstChild.nodeValue = initialInstructionText + ' ';
    statusImage.src       = 'img/green/neutral.svg';
    restartButton.style.display = 'none';
    updateScore();
    updateHintButton();
    statusImage.classList.remove('large');

    selectedNames = shuffle(imageNames).slice(0, maxMatches);
    selectedNames.forEach(name => imageColumn.appendChild(createImageCard(name)));
    shuffle(selectedNames).forEach(name => wordColumn.appendChild(createWordCard(name)));
  }

  restartButton.addEventListener('click', initGame);

  // Start
  initGame();
  updateHintButton();
})();
