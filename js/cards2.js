// js/cards2.js
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[cards2] DOMContentLoaded');

  // ---- DOM ----
  const imageColumn     = document.getElementById('imageColumn');
  const wordColumn      = document.getElementById('wordColumn');
  const scoreDisplay    = document.getElementById('currentScore');
  const hintBtn         = document.getElementById('hintButton');
  const restartBtn      = document.getElementById('restartButton');
  const nextBtn         = document.querySelector('.nextbutton');
  const statusImage     = document.getElementById('statusImage');
  const instructionText = document.getElementById('instructionText'); // <span id="instructionText">

  // Базовая проверка DOM
  const required = { imageColumn, wordColumn, scoreDisplay, hintBtn, restartBtn, statusImage, instructionText };
  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[cards2] Не найден DOM-элемент: ${k}`);
    }
  }

  // ---- Загрузка данных ----
  let cardsData, defsData;
  try {
    const [cardsRes, defsRes] = await Promise.all([
      fetch('data/cards.json'),
      fetch('data/definitions.json')
    ]);
    if (!cardsRes.ok) throw new Error(`cards.json HTTP ${cardsRes.status}`);
    if (!defsRes.ok)  throw new Error(`definitions.json HTTP ${defsRes.status}`);

    cardsData = await cardsRes.json();
    defsData  = await defsRes.json();
  } catch (e) {
    console.error('[cards2] Ошибка загрузки JSON:', e);
    showFatal('Failed to load game data. Check that you run through a local server and file paths are correct.');
    return;
  }

  // ---- Валидация структур ----
  if (!isValidCards(cardsData)) {
    console.error('[cards2] Неверный формат data/cards.json. Ожидается { "cat": ["word","word2", ...], ... }');
    showFatal('cards.json has invalid format.');
    return;
  }
  if (!isValidDefs(defsData)) {
    console.error('[cards2] Неверный формат data/definitions.json. Ожидается { "cat": [ {word, definition}, ... ], ... }');
    showFatal('definitions.json has invalid format.');
    return;
  }

  console.log('[cards2] Данные OK. Инициализирую игру.');
  initGame(cardsData, defsData);

  // ---------- Утилиты ----------
  function showFatal(msg) {
    const box = document.getElementById('result');
    if (box) {
      box.textContent = msg;
      box.style.color = 'crimson';
    }
    if (statusImage) statusImage.src = 'img/green/loser.svg';
  }

  function isValidCards(obj) {
    if (!obj || typeof obj !== 'object') return false;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (!Array.isArray(v)) return false;
      if (v.some(x => typeof x !== 'string')) return false;
    }
    return true;
  }

  function isValidDefs(obj) {
    if (!obj || typeof obj !== 'object') return false;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (!Array.isArray(v)) return false;
      if (v.some(x => !x || typeof x.word !== 'string' || typeof x.definition !== 'string')) return false;
    }
    return true;
  }
});

function initGame(cardsData, defsData) {
  console.log('[cards2] initGame');

  // ---- DOM ----
  const imageColumn     = document.getElementById('imageColumn');
  const wordColumn      = document.getElementById('wordColumn');
  const scoreDisplay    = document.getElementById('currentScore');
  const hintBtn         = document.getElementById('hintButton');
  const restartBtn      = document.getElementById('restartButton');
  const nextBtn         = document.querySelector('.nextbutton');
  const statusImage     = document.getElementById('statusImage');
  const instructionText = document.getElementById('instructionText');

  // ---- Состояние ----
  const maxPairs = 5;
  const LAST_R1 = 'lastCatR1';
  const LAST_R2 = 'lastCatR2';

  let availableHints = +localStorage.getItem('availableHints') || 0;
  let round = 0;          // 0 -> раунд 1 (картинки↔слова), 1 -> раунд 2 (слова↔определения)
  let correct = 0;
  let total = 0;
  let selected = null;    // { el, word, type }
  let selectedPairs = []; // массив слов для подсчёта очков
  let categoryR1 = null;  // категория из cardsData
  let categoryR2 = null;  // категория из defsData (другая)

  const cardCats = Object.keys(cardsData).filter(c => Array.isArray(cardsData[c]) && cardsData[c].length > 0);
  const defCats  = Object.keys(defsData).filter(c => Array.isArray(defsData[c]) && defsData[c].length > 0);

  if (!cardCats.length) {
    console.error('[cards2] Нет категорий в cardsData');
    setResult('No categories in cards.json');
    return;
  }
  if (!defCats.length) {
    console.error('[cards2] Нет категорий в definitionsData');
    setResult('No categories in definitions.json');
    return;
  }

  // ---- Функции ----
  function shuffle(arr) {
    return arr.slice().sort(() => Math.random() - 0.5);
  }

  function pickCategory(list, { exclude = null, storageKey = null } = {}) {
    const last = storageKey ? localStorage.getItem(storageKey) : null;
    const basePool = list.filter(c => c !== exclude);
    const pool = basePool.filter(c => c !== last);
    const finalPool = pool.length ? pool : (basePool.length ? basePool : list);
    if (!finalPool.length) return null;
    const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
    if (storageKey && chosen) localStorage.setItem(storageKey, chosen);
    return chosen;
  }

  function updateScore() {
    if (scoreDisplay) scoreDisplay.textContent = `${correct}/${selectedPairs.length || 5}`;
  }

  function updateHintButton() {
    if (!hintBtn) return;
    hintBtn.textContent = `Hint (${availableHints})`;
    hintBtn.disabled = availableHints === 0;
  }

  function clearColumns() {
    if (imageColumn) imageColumn.innerHTML = '';
    if (wordColumn)  wordColumn.innerHTML  = '';
  }

  function setStatusSmall() {
    if (!statusImage) return;
    statusImage.src = 'img/green/neutral.svg';
    statusImage.classList.remove('large');
  }

  function setStatusFinal(okPerfect) {
    if (!statusImage) return;
    statusImage.classList.add('large');
    statusImage.src = okPerfect ? 'img/green/winner.svg' : 'img/green/loser.svg';
  }

  function setInstruction(text) {
    if (instructionText) instructionText.textContent = text;
  }

  function setResult(text) {
    const box = document.getElementById('result');
    if (box) box.textContent = text || '';
  }

  function handleSelect(el, word, type) {
    if (restartBtn && restartBtn.style.display === 'inline-block') return;
    if (!selected) {
      selected = { el, word, type };
      el.classList.add('selected');
      return;
    }

    total++;
    const isMatch = selected.word === word && selected.type !== type;
    const first = selected.el;
    const second = el;

    first.classList.remove('selected');
    second.classList.remove('selected');

    if (isMatch) {
      first.classList.add('correct');
      second.classList.add('correct');
      correct++;

      setTimeout(() => {
        first.remove();
        second.remove();
        updateScore();
        if (correct === selectedPairs.length) endRound();
      }, 250);
    } else {
      first.classList.add('incorrect');
      second.classList.add('incorrect');
      setTimeout(() => {
        first.classList.remove('incorrect');
        second.classList.remove('incorrect');
      }, 500);
    }

    selected = null;
  }

  function createImageCard(word) {
    const div = document.createElement('div');
    div.className = 'image-item';
    div.dataset.word = word;
    const img = document.createElement('img');
    img.src = `img/cards/${word}.png`;
    img.alt = word;
    div.appendChild(img);
    div.addEventListener('click', () => handleSelect(div, word, 'image'));
    return div;
  }

  function createWordCard(word) {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.word = word;
    div.textContent = word;
    div.addEventListener('click', () => handleSelect(div, word, 'word'));
    return div;
  }

  function createDefinitionCard(definition, word) {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.dataset.word = word;
    div.textContent = definition;
    div.addEventListener('click', () => handleSelect(div, word, 'definition'));
    return div;
  }

  function showHint() {
    if (availableHints <= 0) return;
    const left  = imageColumn.querySelectorAll('[data-word]');
    const right = wordColumn.querySelectorAll('[data-word]');
    for (let l of left) {
      const match = [...right].find(r => r.dataset.word === l.dataset.word);
      if (match) {
        l.classList.add('hinted');
        match.classList.add('hinted');
        setTimeout(() => {
          l.classList.remove('hinted');
          match.classList.remove('hinted');
        }, 1200);
        availableHints--;
        localStorage.setItem('availableHints', availableHints);
        updateHintButton();
        break;
      }
    }
  }

  function endRound() {
    if (round === 0) {
      // Переход ко 2-му раунду
      round = 1;
      setTimeout(startRound, 600);
    } else {
      // Игра завершена
      if (restartBtn) restartBtn.style.display = 'inline-block';
      if (nextBtn)    nextBtn.style.display    = 'inline-block';

      const perfect = correct === selectedPairs.length && total === selectedPairs.length;
      setStatusFinal(perfect);
      setInstruction(perfect ? '🎉 You completed both rounds perfectly!' : 'You completed the game!');
      if (perfect) {
        availableHints++;
        localStorage.setItem('availableHints', availableHints);
      }
      updateHintButton();
    }
  }

  function startRound() {
    clearColumns();
    correct = 0;
    total = 0;
    selected = null;
    setResult('');
    updateScore();
    updateHintButton();
    setStatusSmall();

    if (restartBtn) restartBtn.style.display = 'none';
    if (nextBtn)    nextBtn.style.display    = 'none';

    if (round === 0) {
      // РАУНД 1 — картинки ↔ слова из СЛУЧАЙНОЙ категории cardsData
      categoryR1 = pickCategory(cardCats, { storageKey: LAST_R1 });
      if (!categoryR1 || !cardsData[categoryR1]?.length) {
        console.error('[cards2] Нет валидной категории для Раунда 1');
        setResult('No valid category for round 1.');
        return;
      }
      setInstruction('Match images and words');

      const arr = cardsData[categoryR1];
      const pool = shuffle(arr).slice(0, Math.min(maxPairs, arr.length));
      selectedPairs = pool;

      pool.forEach(word => imageColumn.appendChild(createImageCard(word)));
      shuffle(pool).forEach(word => wordColumn.appendChild(createWordCard(word)));

      console.log('[cards2] Round 1 category:', categoryR1, 'words:', pool);
    } else {
      // РАУНД 2 — слова ↔ определения из ДРУГОЙ категории defsData
      categoryR2 = pickCategory(defCats, { exclude: categoryR1, storageKey: LAST_R2 });
      if (!categoryR2 || !defsData[categoryR2]?.length) {
        // если исключили R1 и ничего не осталось — возьмём любую
        categoryR2 = pickCategory(defCats, { storageKey: LAST_R2 });
      }
      if (!categoryR2 || !defsData[categoryR2]?.length) {
        console.error('[cards2] Нет валидной категории для Раунда 2');
        setResult('No valid category for round 2.');
        return;
      }
      setInstruction('Match words and definitions');

      const arr = defsData[categoryR2];
      const pool = shuffle(arr).slice(0, Math.min(maxPairs, arr.length));
      selectedPairs = pool.map(p => p.word);

      pool.forEach(p => imageColumn.appendChild(createWordCard(p.word)));
      shuffle(pool).forEach(p => wordColumn.appendChild(createDefinitionCard(p.definition, p.word)));

      console.log('[cards2] Round 2 category:', categoryR2, 'pairs:', pool);
    }

    updateScore();
  }

  // ---- Обработчики ----
  if (hintBtn)   hintBtn.addEventListener('click', showHint);
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      round = 0;
      startRound();
    });
  }
  if (nextBtn) {
    // Начать новую игру (снова 2 раунда, с новыми категориями)
    nextBtn.addEventListener('click', () => {
      round = 0;
      startRound();
    });
  }

  // ---- Старт ----
  startRound();
}
