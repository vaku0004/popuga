/*
 * ==== Synonyms/Vocab Game — HYBRID game1.js ====
 *
 * Основано на прежнем game1.js (slug + множества seenEver/usedToday + строгая нормализация)
 * + идей из gamegr2.js (циклическая ротация выученных: lastLearnedIndex, мягкая очистка стабильных карточек)
 *
 * Ключевые возможности:
 * 1) Приоритет показа: NEW → ERROR → LEARNED
 * 2) NEW = карточка, которой ещё НИКОГДА не было в seenEverSlugs
 * 3) ERROR = errors > 0 (и не показана сегодня)
 * 4) LEARNED = (learned === true) ИЛИ (views > 0 && errors === 0 && correctInARow ≥ LEARN_STREAK)
 * 5) Ротация LEARNED по кругу между сессиями (lastLearnedIndex) вместо бессистемного рандома
 * 6) «Стабильно выученные» (views ≥ STABLE_VIEWS && errors === 0) — бережная очистка статистики
 * 7) Ежедневная защита от повторов: usedToday-YYYY-MM-DD (Set)
 * 8) Жёсткая нормализация ответов (кавычки/пробелы/диакритика/регистры)
 * 9) Гигиена хранения: чистим usedToday старше 14 дней, ограничиваем историю очков
 * 10) Надёжные слушатели событий (addEventListener) — без зависимости от inline-атрибутов
 *
 * Как встроить:
 * - Ожидается глобальный массив pairs: [{ main: 'word', synonyms: ['...','...'], defs: ['...'], hint: '...'}]
 * - В разметке: элементы с id: optionsBox, questionText, hintButton, nextButton, statusImage (опционально)
 * - Вызовите initGame() после загрузки данных.
 */

// ==== Config ====
const TOTAL_ROUNDS = 10;                 // Сколько вопросов за сессию
const LEARN_STREAK = 3;                  // Сколько подряд верных до статуса LEARNED
const STABLE_VIEWS = 10;                 // После этого и с errors===0 считаем «стабильной» карточкой
const KEEP_SCORE_HISTORY = 50;           // Сколько последних результатов храним
const USED_TODAY_RETENTION_DAYS = 14;    // Сколько дней хранить usedToday

// ==== DOM ====
const $ = (sel) => document.querySelector(sel);
const optionsBox = $('#optionsBox');
const questionText = $('#questionText');
const hintButton = $('#hintButton');
const nextButton = $('#nextButton');
const statusImage = $('.status-image'); // необязательно

// ==== Date key ====
const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ==== Storage keys ====
const LS = {
  WORD_STATS: 'userWordStats',          // { [slug]: {views, errors, correctInARow, learned, lastSeen, main} }
  SEEN_EVER: 'seenEverSlugs',           // JSON Set-like array
  USED_TODAY_PREFIX: 'usedToday-',      // usedToday-YYYY-MM-DD => JSON Set-like array
  SCORE_HISTORY: 'synonymScores',       // { 'YYYY-MM-DD': {score, total} }
  LAST_LEARNED_INDEX: 'lastLearnedIndex',
  LEARNED_ORDER: 'learnedOrder',        // массив слугов выбранного «списка» LEARNED для ротации
};

// ==== Utilities ====
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('loadJSON failed for', key, e);
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('saveJSON failed for', key, e);
  }
}

function loadSet(key) {
  const arr = loadJSON(key, []);
  return new Set(Array.isArray(arr) ? arr : []);
}
function saveSet(key, set) {
  saveJSON(key, Array.from(set));
}

function addToSetKey(key, value) {
  const s = loadSet(key);
  s.add(value);
  saveSet(key, s);
}

function rmDiacritics(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeSpaces(s) {
  // Заменяем неразрывные и «узкие» пробелы на обычные
  return s.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
          .replace(/\s+/g, ' ') // схлопываем
          .trim();
}

function normalizeQuotes(s) {
  // Приводим «умные» кавычки и разные апострофы к стандартным
  return s
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟]/g, '"');
}

function normalizeAnswer(s) {
  if (!s) return '';
  let x = String(s).toLowerCase();
  x = normalizeQuotes(x);
  x = rmDiacritics(x);
  x = normalizeSpaces(x);
  return x;
}

function slugOf(text) {
  // Каноничный ключ для карточки — по main
  return normalizeAnswer(text)
    .replace(/[^a-z0-9\-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, k) {
  if (k >= arr.length) return shuffle(arr);
  const copy = shuffle(arr);
  return copy.slice(0, k);
}

// ==== Data access ====
let wordStats = loadJSON(LS.WORD_STATS, {}); // per slug
let seenEver = loadSet(LS.SEEN_EVER);
let usedToday = loadSet(LS.USED_TODAY_PREFIX + dateKey);
let scoreHistory = loadJSON(LS.SCORE_HISTORY, {});

function markSeen(slug, main) {
  seenEver.add(slug);
  saveSet(LS.SEEN_EVER, seenEver);
  // Сохраняем main внутрь stats для диагностики
  if (!wordStats[slug]) wordStats[slug] = { views: 0, errors: 0, correctInARow: 0, learned: false, lastSeen: null, main };
  saveJSON(LS.WORD_STATS, wordStats);
}

function bumpViews(slug) {
  const ws = (wordStats[slug] ||= { views: 0, errors: 0, correctInARow: 0, learned: false, lastSeen: null });
  ws.views++;
  ws.lastSeen = Date.now();
  saveJSON(LS.WORD_STATS, wordStats);
}
function bumpCorrect(slug) {
  const ws = (wordStats[slug] ||= { views: 0, errors: 0, correctInARow: 0, learned: false, lastSeen: null });
  ws.correctInARow++;
  if (ws.correctInARow >= LEARN_STREAK) ws.learned = true;
  saveJSON(LS.WORD_STATS, wordStats);
}
function bumpError(slug) {
  const ws = (wordStats[slug] ||= { views: 0, errors: 0, correctInARow: 0, learned: false, lastSeen: null });
  ws.errors++;
  ws.correctInARow = 0; // сбрасываем серию
  saveJSON(LS.WORD_STATS, wordStats);
}

function stableLearnedCleanup(slug) {
  const ws = wordStats[slug];
  if (!ws) return;
  if (ws.errors === 0 && ws.views >= STABLE_VIEWS) {
    // Считаем стабильно выученной — можно облегчить объект (не удаляем полностью, чтобы не потерять seenEver)
    delete ws.correctInARow;
    delete ws.lastSeen;
    saveJSON(LS.WORD_STATS, wordStats);
  }
}

// ==== Hygiene ====
function purgeOldUsedToday() {
  // Удаляем usedToday-* старше N дней
  try {
    const now = new Date(dateKey);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(LS.USED_TODAY_PREFIX)) {
        const d = key.slice(LS.USED_TODAY_PREFIX.length);
        const dt = new Date(d);
        const diffDays = (now - dt) / (1000 * 60 * 60 * 24);
        if (diffDays > USED_TODAY_RETENTION_DAYS) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) { console.warn('purgeOldUsedToday failed', e); }
}

function trimScoreHistory() {
  const keys = Object.keys(scoreHistory).sort();
  if (keys.length > KEEP_SCORE_HISTORY) {
    const toDrop = keys.length - KEEP_SCORE_HISTORY;
    for (let i = 0; i < toDrop; i++) delete scoreHistory[keys[i]];
    saveJSON(LS.SCORE_HISTORY, scoreHistory);
  }
}

purgeOldUsedToday();
trimScoreHistory();

// ==== Pools (NEW / ERROR / LEARNED) ====
function classifyPairs(pairs) {
  const NEW = [], ERR = [], LEARN = [];
  for (const p of pairs) {
    const main = p.main || p.word || '';
    const slug = slugOf(main);
    const ws = wordStats[slug];

    // Новое слово — если его нет в seenEver
    if (!seenEver.has(slug)) {
      NEW.push({ p, slug });
      continue;
    }

    // Ошибочное — если есть ошибки
    if (ws && ws.errors > 0) {
      ERR.push({ p, slug });
      continue;
    }

    // Выученное — learned === true, либо порог по streak
    const learned = ws && (ws.learned === true || (ws.views > 0 && ws.errors === 0 && (ws.correctInARow || 0) >= LEARN_STREAK));
    if (learned) LEARN.push({ p, slug });
  }
  return { NEW, ERR, LEARN };
}

// ==== LEARNED rotation ====
function getLearnedOrder(slugs) {
  // Сохраняем фиксированный порядок для ротации, чтобы не прыгало между сессиями
  let order = loadJSON(LS.LEARNED_ORDER, []);
  // Если список не совпадает — пересоздаём в перемешанном виде
  const same = order.length === slugs.length && order.every((s) => slugs.includes(s));
  if (!same) {
    order = shuffle(slugs.slice());
    saveJSON(LS.LEARNED_ORDER, order);
    localStorage.setItem(LS.LAST_LEARNED_INDEX, '0');
  }
  return order;
}

function pickFromLearned(learnArr) {
  if (learnArr.length === 0) return null;
  const slugs = learnArr.map(x => x.slug);
  const order = getLearnedOrder(slugs);
  let idx = parseInt(localStorage.getItem(LS.LAST_LEARNED_INDEX) || '0', 10) || 0;

  // Ищем следующий slug из order, который ещё не показывали сегодня
  for (let i = 0; i < order.length; i++) {
    const slug = order[(idx + i) % order.length];
    if (!usedToday.has(slug)) {
      const item = learnArr.find(x => x.slug === slug);
      localStorage.setItem(LS.LAST_LEARNED_INDEX, String((idx + i + 1) % order.length));
      return item;
    }
  }
  // Все показаны сегодня — сбрасываем дневной барьер для LEARNED
  return null;
}

// ==== Build options ====
function buildOptionsFor(main, allPairs) {
  const correct = (Array.isArray(main.synonyms) ? main.synonyms : []).map(normalizeAnswer);
  // Правильный ответ — любая форма из synonyms или сам main
  const correctAnswers = new Set([...correct, normalizeAnswer(main.main || main.word || '')]);

  // Берём несколько отвлекающих вариантов из других карточек
  const distractors = [];
  const pool = shuffle(allPairs);
  for (const it of pool) {
    const s = normalizeAnswer(it.main || it.word || '');
    if (!correctAnswers.has(s)) distractors.push(s);
    if (distractors.length >= 3) break;
  }

  const options = shuffle([ ...sample(Array.from(correctAnswers), 1), ...sample(distractors, 3) ]);
  return options;
}

// ==== Game state ====
let currentIndex = 0;
let currentPair = null; // { p, slug }
let scoreToday = 0;
let askedToday = 0;

function selectNextPair(pairs) {
  const { NEW, ERR, LEARN } = classifyPairs(pairs);

  // 1) NEW — берём первый, которого не было сегодня
  const newPick = NEW.find(x => !usedToday.has(x.slug));
  if (newPick) return newPick;

  // 2) ERR — берём любой ещё не показанный сегодня
  const errPick = ERR.find(x => !usedToday.has(x.slug));
  if (errPick) return errPick;

  // 3) LEARNED — по кругу
  const learnPick = pickFromLearned(LEARN);
  if (learnPick) return learnPick;

  // Если всё сегодня уже было — разрешаем повтор LEARNED
  if (LEARN.length) return LEARN[Math.floor(Math.random() * LEARN.length)];

  // Ничего не нашли
  return null;
}

function renderQuestion(pair) {
  const p = pair.p;
  questionText && (questionText.textContent = p.defs?.[0] || p.hint || `Find a synonym for: ${(p.main || p.word)}`);
  const opts = buildOptionsFor(p, pairs);

  if (optionsBox) {
    optionsBox.innerHTML = '';
    opts.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => onAnswerClick(opt));
      optionsBox.appendChild(btn);
    });
  }
}

function showHint() {
  if (!currentPair) return;
  const p = currentPair.p;
  const msg = p.hint || p.defs?.[0] || 'No hint for this card';
  alert(msg);
}

function onAnswerClick(answer) {
  if (!currentPair) return;
  const p = currentPair.p;
  const slug = currentPair.slug;

  const normalized = normalizeAnswer(answer);
  const correctSet = new Set([
    normalizeAnswer(p.main || p.word || ''),
    ...((p.synonyms || []).map(normalizeAnswer))
  ]);

  const isCorrect = correctSet.has(normalized);
  if (isCorrect) {
    scoreToday++;
    bumpCorrect(slug);
    stableLearnedCleanup(slug);
    statusImage && (statusImage.src = 'img/right.svg');
  } else {
    bumpError(slug);
    statusImage && (statusImage.src = 'img/wrong.svg');
  }

  // Следующий
  nextButton && nextButton.removeAttribute('disabled');
  // Блокируем выбор, чтобы не кликали дальше
  if (optionsBox) Array.from(optionsBox.querySelectorAll('button')).forEach(b => (b.disabled = true));
}

function nextQuestion() {
  if (askedToday >= TOTAL_ROUNDS) {
    finishSession();
    return;
  }
  const pick = selectNextPair(pairs);
  if (!pick) {
    finishSession();
    return;
  }
  currentPair = pick;
  const slug = pick.slug;

  // Отметить seenEver и usedToday
  markSeen(slug, pick.p.main || pick.p.word);
  addToSetKey(LS.USED_TODAY_PREFIX + dateKey, slug);
  usedToday = loadSet(LS.USED_TODAY_PREFIX + dateKey);

  bumpViews(slug);
  askedToday++;
  nextButton && nextButton.setAttribute('disabled', 'disabled');
  renderQuestion(pick);
}

function finishSession() {
  // Записываем результат дня
  scoreHistory[dateKey] = { score: scoreToday, total: askedToday };
  saveJSON(LS.SCORE_HISTORY, scoreHistory);
  trimScoreHistory();

  // Переход или сообщение — на ваше усмотрение
  alert(`Session finished: ${scoreToday}/${askedToday}`);
}

function wireUI() {
  if (hintButton && !hintButton.__wired) {
    hintButton.addEventListener('click', showHint);
    hintButton.__wired = true;
  }
  if (nextButton && !nextButton.__wired) {
    nextButton.addEventListener('click', nextQuestion);
    nextButton.__wired = true;
  }
}

// ==== Public init ====
// Требуется глобальный массив pairs
if (!Array.isArray(window.pairs)) {
  console.warn('Expected global pairs array. Please define window.pairs = [...] before loading this script.');
}

function initGame() {
  wireUI();
  // Сброс статуса
  statusImage && (statusImage.src = 'img/neutral.svg');
  // Подготовка learned order на текущий список
  const { LEARN } = classifyPairs(pairs);
  getLearnedOrder(LEARN.map(x => x.slug));
  // Поехали
  askedToday = 0;
  scoreToday = 0;
  nextQuestion();
}

// Экспортируем в глобальную область
window.initGame = initGame;
window._debug = {
  classifyPairs,
  pickFromLearned,
  normalizeAnswer,
  slugOf,
  wordStats: () => wordStats,
  seenEver: () => Array.from(seenEver),
  usedToday: () => Array.from(usedToday),
};
