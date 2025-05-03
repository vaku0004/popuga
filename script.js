// script.js
(() => {
  // 1) Список доступных файлов/слов
  const imageNames = [
    "a puddle", "a saucer", "a well",
    "to clap", "to dunk", "to nudge",
    "to shrug", "to simmer", "to sip",
    "to stir", "to stroke someone",
    "to tickle someone", "to wink"
  ];

  // 2) DOM-элементы
  const imageColumn   = document.getElementById('imageColumn');
  const wordColumn    = document.getElementById('wordColumn');
  const instructionEl = document.querySelector('.instruction');
  const statusImage   = document.querySelector('.status-image');
  const scoreDisplay  = document.getElementById('currentScore');
  const scoreBox      = document.querySelector('.score-box');
 

  // 3) Сохраняем исходную инструкцию
  const initialInstructionText = instructionEl.textContent.trim();
  instructionEl.textContent = '';
  const instructionTextNode = document.createTextNode(initialInstructionText);
  instructionEl.appendChild(instructionTextNode);

  // 4) Кнопки
  // Подсказка
  const hintButton = document.createElement('button');
  hintButton.className = 'hint-button';
  hintButton.addEventListener('click', showHint);
  scoreBox.appendChild(hintButton);

  // Play Again / Try Again
  const restartButton = document.createElement('button');
  restartButton.className = 'restart-button';
  restartButton.style.display = 'none';
  restartButton.addEventListener('click', initGame);
  instructionEl.appendChild(restartButton);

  // 5) Состояние из localStorage
  let availableHints = +localStorage.getItem('availableHints') || 0;
  let scoreHistory   = JSON.parse(localStorage.getItem('matchScores') || '{}');
  const dateKey      = new Date().toISOString().split('T')[0];

  // 6) Текущее состояние игры
  let selectedElement = null;
  let correctMatches  = 0;
  let totalAttempts   = 0;
  const maxMatches    = 5;
  let selectedNames   = [];

  // 7) Перемешивание
  function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }

  // 8) Создание карточек
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

  // 9) Обработка кликов
  function handleSelect(element, word, type) {
    if (restartButton.style.display === 'inline-block') return;

    if (!selectedElement) {
      selectedElement = { element, word, type };
      element.classList.add('selected');
      return;
    }

    totalAttempts++;
    const isMatch = selectedElement.word === word && selectedElement.type !== type;
    const firstEl  = selectedElement.element.closest('.image-item, .word-item');
    const secondEl = element.closest('.image-item, .word-item');

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
          // Побеждает только если не было ошибок
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

  // 10) Обновление счёта
  function updateScore() {
    scoreDisplay.textContent = `${correctMatches}/${maxMatches}`;
  }

  // 11) Окончание игры
  function endGame(won) {
    // Сохраняем результат
    scoreHistory[dateKey] = { correct: correctMatches, attempts: totalAttempts };
    localStorage.setItem('matchScores', JSON.stringify(scoreHistory));

    if (won) {
      instructionTextNode.nodeValue = `🎉 You are the winner! Score: ${correctMatches}/${totalAttempts}. `;
      restartButton.textContent = 'Play Again';
      statusImage.src = "img/green/medal.png";
      availableHints++;
      localStorage.setItem('availableHints', availableHints);
    } else {
      instructionTextNode.nodeValue = `Your score: ${correctMatches}/${totalAttempts}. `;
      restartButton.textContent = 'Try Again';
      statusImage.src = "img/green/looser.svg";
    }

    restartButton.style.display = 'inline-block';
    updateHintButton();
  }

  // 12) Подсказка
  function updateHintButton() {
    hintButton.textContent = `Hint (${availableHints})`;
    hintButton.disabled = availableHints === 0;
  }

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

  // 13) Инициализация / рестарт
  function initGame() {
    imageColumn.innerHTML = '';
    wordColumn.innerHTML  = '';
    correctMatches        = 0;
    totalAttempts         = 0;
    selectedElement       = null;
    instructionTextNode.nodeValue = initialInstructionText + ' ';
    statusImage.src       = 'img/green/neutral.svg';
    restartButton.style.display = 'none';
    updateScore();
    updateHintButton();

    selectedNames = shuffle(imageNames).slice(0, maxMatches);
    selectedNames.forEach(name => imageColumn.appendChild(createImageCard(name)));
    shuffle(selectedNames).forEach(name => wordColumn.appendChild(createWordCard(name)));
  }

  // 14) Стартуем игру
  initGame();
})();
