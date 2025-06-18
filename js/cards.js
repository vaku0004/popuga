// cards.js – fully updated, works with data/cards.json

// 1. Загружаем JSON‑файл и только потом стартуем игру
// ---------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('data/cards.json');
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const groupedWords = await response.json();
    initGame(groupedWords);
  } catch (err) {
    console.error('❌ не удалось загрузить data/cards.json:', err);
  }
});

// 2. Вся логика игры вынесена в функцию, которая получает данные
// ---------------------------------------------------------------

function initGame(groupedWords) {
  // --- ПЕРЕМЕННЫЕ -------------------------------------------
  const maxMatches = 5;
  const dateKey    = new Date().toISOString().split('T')[0];

  let wordPools       = {}; // кеш слов, чтобы не повторялись
  let availableHints  = +localStorage.getItem('availableHints') || 0;
  let scoreHistory    = JSON.parse(localStorage.getItem('matchScores')  || '{}');
  let imageFrequency  = JSON.parse(localStorage.getItem('imageFrequency') || '{}');

  let selectedElement = null;
  let correctMatches  = 0;
  let totalAttempts   = 0;
  let selectedNames   = [];

  let currentRound      = 0; // 0 и 1 – всего два раунда
  let selectedCategories = [];
  let roundScores        = [];

  // --- DOM ---------------------------------------------------
  const imageColumn    = document.getElementById('imageColumn');
  const wordColumn     = document.getElementById('wordColumn');
  const instructionEl  = document.querySelector('.instruction');
  const statusImage    = document.getElementById('statusImage');
  const scoreDisplay   = document.getElementById('currentScore');

  const hintButton     = document.getElementById('hintButton');
  const restartButton  = document.getElementById('restartButton');
  const nextButton     = document.querySelector('.nextbutton');
  const initialText    = instructionEl.firstChild.nodeValue.trim();

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ------------------------------

  const shuffle = (array) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getWordsFromPool = (category, count) => {
    if (!wordPools[category] || wordPools[category].length < count) {
      wordPools[category] = shuffle(groupedWords[category].slice());
    }
    return wordPools[category].splice(0, count);
  };

  const getTwoRandomCategories = () => {
    const valid = Object.keys(groupedWords).filter(k => groupedWords[k].length >= maxMatches);
    return shuffle(valid).slice(0, 2);
  };

  const updateScore = () => {
    scoreDisplay.textContent = `${correctMatches}/${maxMatches}`;
  };

  const updateHintButton = () => {
    hintButton.textContent = `Hint (${availableHints})`;
    hintButton.disabled = availableHints === 0;
  };

  const createImageCard = (name) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-item';
    wrapper.dataset.word = name;

    const img = document.createElement('img');
    img.src = `img/cards/${name}.png`;
    img.alt = name;

    wrapper.appendChild(img);
    wrapper.addEventListener('click', () => handleSelect(wrapper, name, 'image'));
    return wrapper;
  };

  const createWordCard = (name) => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.word = name;
    div.textContent = name;
    div.addEventListener('click', () => handleSelect(div, name, 'word'));
    return div;
  };

  // --- ОСНОВНАЯ ЛОГИКА ВЫБОРА --------------------------------

  const handleSelect = (element, word, type) => {
    if (restartButton.style.display === 'inline-block') return; // игра закончена

    if (!selectedElement) {
      selectedElement = { element, word, type };
      element.classList.add('selected');
      return;
    }

    totalAttempts++;
    const isMatch  = selectedElement.word === word && selectedElement.type !== type;
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
        if (correctMatches === maxMatches) endGame();
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
  };

  // --- Подсказка ("Hint") -----------------------------------

  const showHint = () => {
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
  };

  // --- Завершение игры / раунда ------------------------------

  const endGame = () => {
    roundScores.push({ correct: correctMatches, attempts: totalAttempts });

    if (currentRound === 0) {
      // Переходим ко второму раунду
      currentRound = 1;
      setTimeout(startRound, 1000);
      return;
    }

    // Оба раунда пройдены: считаем итоговый счёт
    const totalCorrect = roundScores[0].correct + roundScores[1].correct;
    const totalTotal   = roundScores[0].attempts + roundScores[1].attempts;

    scoreHistory[dateKey] = { correct: totalCorrect, attempts: totalTotal };
    localStorage.setItem('matchScores', JSON.stringify(scoreHistory));

    statusImage.classList.add('large');

    if (totalCorrect === maxMatches * 2) {
      instructionEl.firstChild.nodeValue = '🎉 You won both rounds!';
      statusImage.src = 'img/green/winner.svg';
      availableHints++;
      localStorage.setItem('availableHints', availableHints);
    } else {
      instructionEl.firstChild.nodeValue = `Final score: ${totalCorrect}/${totalTotal}`;
      statusImage.src = 'img/green/loser.svg';
    }

    restartButton.style.display = 'inline-block';
    if (nextButton) nextButton.style.display = 'inline-block';
    updateHintButton();
  };

  const formatCategoryName = (key) => key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase());

  // --- Запуск нового раунда ----------------------------------

  const startRound = () => {
    imageColumn.innerHTML = '';
    wordColumn.innerHTML  = '';

    correctMatches = 0;
    totalAttempts  = 0;
    selectedElement = null;

    updateScore();
    updateHintButton();

    const category = selectedCategories[currentRound];
    const words    = getWordsFromPool(category, maxMatches);

    selectedNames = words;

    instructionEl.firstChild.nodeValue = `Match words from category: ${formatCategoryName(category)}`;
    statusImage.src = 'img/green/neutral.svg';
    statusImage.classList.remove('large');

    restartButton.style.display = 'none';
    if (nextButton) nextButton.style.display = 'none';

    // учитываем, сколько раз показывали каждую картинку
    selectedNames.forEach(name => {
      imageFrequency[name] = (imageFrequency[name] || 0) + 1;
    });
    localStorage.setItem('imageFrequency', JSON.stringify(imageFrequency));

    // отрисовываем карточки
    words.forEach(name => imageColumn.appendChild(createImageCard(name)));
    shuffle(words).forEach(name => wordColumn.appendChild(createWordCard(name)));
  };

  // --- Слушатели кликов на кнопки -----------------------------

  hintButton.addEventListener('click', showHint);

  restartButton.addEventListener('click', () => {
    currentRound = 0;
    selectedCategories = getTwoRandomCategories();
    roundScores = [];
    if (nextButton) nextButton.style.display = 'none';
    startRound();
  });

  // --- СТАРТ ИГРЫ --------------------------------------------

  selectedCategories = getTwoRandomCategories();
  startRound();
}
