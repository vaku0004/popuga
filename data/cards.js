(() => {
  const groupedWords = {
    phrasalVerbs: [
      "to look into", "to look out", "to look at", "to set up", "to set off"
    ],
      getVerbs: [
      "to get on", "to get off", "to get in", "to get out", "to get along",
    ],
       breakVerbs: [
      "to break", "to break up", "to break down", "to break out", "to break into",
    ],
    bodyActions: [
      "to shrug", "to nudge", "to wink", "to clap", "to stroke someone", "to tickle someone"
    ],
    cooking: [
      "to sip", "to stir", "to simmer", "to dunk", "to nibble", "to nibble on"
    ],
    buildings: [
      "a stately home", "a derelict home", "a lodge", "a cabin", "a high-rise building"
    ],
    terrain: [
      "kerb", "slabs", "runoff", "a ditch", "a woodpile", "peat", "drizzle", "levelled", "a shrub",
    ],
    verbs: [
      "to steer", "to pluck", "to creep", "to hang", "to excavate", "to fasten", "to dispense","to rise up",
       "to crouch down",  "to catch up", "to insulate","to insulate",
    ],
      cleaning: [ 
      "to sort out", "to clear up", "to wash down", "to wash out", "to wash off", "to clear away", "to clean up" 
    ],
      environment: [ 
      "contamination", "to dispose of", "a power plant", "deforestation", "a landfill", 
    ],
    nouns: [
      "a spring",  "seabed",  "a trolley",  "a puddle", "a twig", "a technician",
      "a well", "a tent", "glaciers", "a gale", "an overlook", "an allotement", "a warden"
    ],
    others: [
      "a nuclear family", "an extended family","a saucer", "clutter","drawers", "vexed", "contentious", 
    ]
  };

  // Word pools per category to avoid repetition
  let wordPools = {};

  function getWordsFromPool(category, count) {
    if (!wordPools[category] || wordPools[category].length < count) {
      wordPools[category] = shuffle(groupedWords[category].slice());
    }
    return wordPools[category].splice(0, count);
  }

  const imageColumn = document.getElementById('imageColumn');
  const wordColumn = document.getElementById('wordColumn');
  const instructionEl = document.querySelector('.instruction');
  const statusImage = document.getElementById('statusImage');
  const scoreDisplay = document.getElementById('currentScore');
  const hintButton = document.getElementById('hintButton');
  const restartButton = document.getElementById('restartButton');

  const initialInstructionText = instructionEl.firstChild.nodeValue.trim();
  const maxMatches = 5;
  const dateKey = new Date().toISOString().split('T')[0];

  let availableHints = +localStorage.getItem('availableHints') || 0;
  let scoreHistory = JSON.parse(localStorage.getItem('matchScores') || '{}');
  let imageFrequency = JSON.parse(localStorage.getItem('imageFrequency') || {});

  let selectedElement = null;
  let correctMatches = 0;
  let totalAttempts = 0;
  let selectedNames = [];

  let currentRound = 0;
  let selectedCategories = [];
  let roundScores = [];

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getTwoRandomCategories() {
    const valid = Object.keys(groupedWords).filter(k => groupedWords[k].length >= maxMatches);
    return shuffle(valid).slice(0, 2);
  }

  function updateScore() {
    scoreDisplay.textContent = `${correctMatches}/${maxMatches}`;
  }

  function updateHintButton() {
    hintButton.textContent = `Hint (${availableHints})`;
    hintButton.disabled = availableHints === 0;
  }

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

  function handleSelect(element, word, type) {
    if (restartButton.style.display === 'inline-block') return;

    if (!selectedElement) {
      selectedElement = { element, word, type };
      element.classList.add('selected');
      return;
    }

    totalAttempts++;
    const isMatch = selectedElement.word === word && selectedElement.type !== type;
    const firstEl = selectedElement.element;
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
          endGame(true);
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

  function showHint() {
    if (availableHints <= 0) return;
    const imgs = document.querySelectorAll('.image-item');
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

  function endGame(wonThisRound) {
    roundScores.push({ correct: correctMatches, attempts: totalAttempts });

    if (currentRound === 0) {
      currentRound = 1;
      setTimeout(startRound, 1000);
      return;
    }

    const totalCorrect = roundScores[0].correct + roundScores[1].correct;
    const totalTotal = roundScores[0].attempts + roundScores[1].attempts;

    scoreHistory[dateKey] = { correct: totalCorrect, attempts: totalTotal };
    localStorage.setItem('matchScores', JSON.stringify(scoreHistory));

    statusImage.classList.add('large');

    if (totalCorrect === maxMatches * 2) {
      instructionEl.firstChild.nodeValue = `🎉 You won both rounds! `;
      statusImage.src = 'img/green/winner.svg';
      availableHints++;
      localStorage.setItem('availableHints', availableHints);
    } else {
      instructionEl.firstChild.nodeValue = `Final score: ${totalCorrect}/${totalTotal}`;
      statusImage.src = 'img/green/loser.svg';
    }

    restartButton.textContent = 'Play Again';
    restartButton.style.display = 'inline-block';
    updateHintButton();
  }

  function formatCategoryName(key) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
  }

  function startRound() {
    imageColumn.innerHTML = '';
    wordColumn.innerHTML = '';
    correctMatches = 0;
    totalAttempts = 0;
    selectedElement = null;
    updateScore();
    updateHintButton();

    const category = selectedCategories[currentRound];
    const words = getWordsFromPool(category, maxMatches);
    selectedNames = words;

    instructionEl.firstChild.nodeValue = `Match words from category: ${formatCategoryName(category)}`;
    statusImage.src = 'img/green/neutral.svg';
    restartButton.style.display = 'none';
    statusImage.classList.remove('large');

    selectedNames.forEach(name => {
      imageFrequency[name] = (imageFrequency[name] || 0) + 1;
    });
    localStorage.setItem('imageFrequency', JSON.stringify(imageFrequency));

    words.forEach(name => imageColumn.appendChild(createImageCard(name)));
    shuffle(words).forEach(name => wordColumn.appendChild(createWordCard(name)));
  }

  restartButton.addEventListener('click', () => {
    currentRound = 0;
    selectedCategories = getTwoRandomCategories();
    roundScores = [];
    startRound();
  });

  // Launch game
  currentRound = 0;
  selectedCategories = getTwoRandomCategories();
  roundScores = [];
  startRound();
})();
