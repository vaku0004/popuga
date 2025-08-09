// ─────────────────────────────────────────────────────────────────────────────
// Synonyms/Vocab Game – gamegr3.js (lazy init + external injector)
// - Tries to read data from window.shuffledPairs | window.pairs | window.vocabulary
// - If not found immediately, waits up to 10s for data to appear
// - Or call window.startGameGR3(dataArray) at any time to start explicitly
// Pools: NEW → MISTAKES → MASTERED; uses seenEver & usedToday (per-day) tracking
// ─────────────────────────────────────────────────────────────────────────────
(function(){
  'use strict';

  // ---- Config ----
  const TOTAL_ROUNDS = 10;
  const MASTERED_DELTA = 2;
  const STORAGE_PREFIX = "SG3";
  const WORD_STATS_KEY = `${STORAGE_PREFIX}:wordStats`;
  const SEEN_EVER_KEY  = `${STORAGE_PREFIX}:seenEverSlugs`;
  const USED_TODAY_KEY = `${STORAGE_PREFIX}:usedTodaySlugs`;
  const USED_TODAY_DATE_KEY = `${STORAGE_PREFIX}:usedTodayDate`;

  // ---- UI ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const questionEl = $("#questionText") || $("#instructionText") || $("#question") || $("h1");
  const optionsContainer = $("#options") || $("#wordColumn") || $("#choices") || $("#answers");
  const hintBtn = $("#hintButton");
  const restartBtn = $("#restartButton");
  const nextBtn = $(".nextbutton");

  // ---- Utils ----
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const readJSON = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const shuffle = (a0) => { const a=a0.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const uniq = (arr) => Array.from(new Set(arr));

  // ---- Persistence ----
  let wordStats = readJSON(WORD_STATS_KEY, {});
  let seenEver = readJSON(SEEN_EVER_KEY, []);
  const storedDate = localStorage.getItem(USED_TODAY_DATE_KEY);
  const tKey = todayKey();
  if (storedDate !== tKey) { writeJSON(USED_TODAY_KEY, []); localStorage.setItem(USED_TODAY_DATE_KEY, tKey); }
  let usedToday = readJSON(USED_TODAY_KEY, []);
  const saveStats = () => writeJSON(WORD_STATS_KEY, wordStats);
  const saveSeenEver = () => writeJSON(SEEN_EVER_KEY, seenEver = uniq(seenEver));
  const saveUsedToday = () => writeJSON(USED_TODAY_KEY, usedToday = uniq(usedToday));

  // ---- Data normalization ----
  const normalizeItem = (obj, idx) => {
    const main = obj.main || obj.word || obj.question || String(obj.text || obj.term || "").trim();
    const correct = obj.correct || obj.answer || obj.definition || obj.synonym;
    const options = Array.isArray(obj.options) ? obj.options.slice()
                   : (Array.isArray(obj.choices) ? obj.choices.slice() : []);
    const slug = (obj._k || (main ? main.toLowerCase() : `idx_${idx}`)).replace(/\s+/g, "_");
    return { slug, main, correct, options };
  };
  function getGlobalData() {
    const raw = (window.shuffledPairs || window.pairs || window.vocabulary || window.wordPairs || window.cards || window.CARDS || []);
    return Array.isArray(raw) ? raw : [];
  }

  function normalizeData(raw){
    return raw.map(normalizeItem).filter(x => x.main && x.correct);
  }

  // ---- Categorization ----
  const isNew = (slug) => !seenEver.includes(slug);
  const isMistake = (slug) => { const s = wordStats[slug]; return s ? (s.w||0) > (s.r||0) : false; };
  const isMastered = (slug) => { const s = wordStats[slug]; if(!s) return false; return ((s.r||0) - (s.w||0)) >= MASTERED_DELTA; };

  // ---- Game state ----
  let DATA = [];
  let sessionQueue = [];
  let currentIndex = 0;
  let currentItem = null;

  function setQuestion(text){ if(questionEl) questionEl.textContent = text; }
  function clearOptions(){ if(optionsContainer) optionsContainer.innerHTML = ""; }
  function renderOptions(item){
    if(!optionsContainer) return;
    const opts = item.options && item.options.length ? item.options.slice() : [item.correct];
    if(!opts.includes(item.correct)) opts.push(item.correct);
    const shuffled = shuffle(opts);
    clearOptions();
    shuffled.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.textContent = opt;
      btn.addEventListener("click", () => onAnswer(opt, item));
      optionsContainer.appendChild(btn);
    });
  }

  function normalize(s){
    return String(s||"").toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/['’`"]/g, "'").trim();
  }

  function onAnswer(userText, item){
    const ok = normalize(userText) === normalize(item.correct);
    const slug = item.slug;
    let s = wordStats[slug] || { r:0, w:0, lastSeen:null };
    ok ? s.r++ : s.w++;
    s.lastSeen = todayKey();
    wordStats[slug] = s; saveStats();

    if(!seenEver.includes(slug)) { seenEver.push(slug); saveSeenEver(); }
    if(!usedToday.includes(slug)) { usedToday.push(slug); saveUsedToday(); }

    flashResult(ok);
    setTimeout(nextQuestion, 300);
  }

  function flashResult(ok){
    const statusImg = document.querySelector("#statusImage");
    if (statusImg) {
      statusImg.alt = ok ? "right" : "wrong";
      statusImg.src = ok ? (statusImg.dataset.right || statusImg.src) : (statusImg.dataset.wrong || statusImg.src);
    }
    document.documentElement.classList.remove("answer-right","answer-wrong");
    document.documentElement.classList.add(ok ? "answer-right" : "answer-wrong");
    setTimeout(() => document.documentElement.classList.remove("answer-right","answer-wrong"), 250);
  }

  function buildSessionQueue(){
    const notUsedToday = DATA.filter(it => !usedToday.includes(it.slug));
    const newPool = shuffle(notUsedToday.filter(it => isNew(it.slug)));
    const mistakePool = shuffle(notUsedToday.filter(it => !isNew(it.slug) && isMistake(it.slug)));
    const masteredPool = shuffle(notUsedToday.filter(it => !isNew(it.slug) && !isMistake(it.slug)));

    const queue = [];
    const take = (pool) => { while(pool.length && queue.length < TOTAL_ROUNDS) queue.push(pool.shift()); };
    take(newPool); if(queue.length<TOTAL_ROUNDS) take(mistakePool); if(queue.length<TOTAL_ROUNDS) take(masteredPool);

    if(queue.length===0 && DATA.length>0){
      const allMist = shuffle(DATA.filter(it => isMistake(it.slug)));
      const allOther = shuffle(DATA.filter(it => !isMistake(it.slug)));
      take(allMist); if(queue.length<TOTAL_ROUNDS) take(allOther);
    }
    return queue;
  }

  function drawCurrent(){
    if(!currentItem) return;
    setQuestion(currentItem.main);
    renderOptions(currentItem);
  }
  function nextQuestion(){
    currentIndex++;
    if(currentIndex>=sessionQueue.length){ startSession(); return; }
    currentItem = sessionQueue[currentIndex]; drawCurrent();
  }
  function startSession(){
    sessionQueue = buildSessionQueue();
    currentIndex = 0;
    currentItem = sessionQueue[0] || null;
    if(!currentItem){ setQuestion("Нет доступных заданий."); clearOptions(); return; }
    drawCurrent();
  }

  // ---- Public injector ----
  window.startGameGR3 = function(dataArray){
    DATA = normalizeData(Array.isArray(dataArray)?dataArray:[]);
    if(DATA.length===0){ console.warn("[gamegr3] startGameGR3 called with empty data"); }
    startSession();
  };

  // ---- Lazy auto-start ----
  function attemptAutoStart(maxMs=10000){
    const t0 = Date.now();
    (function tick(){
      const raw = getGlobalData();
      if(Array.isArray(raw) && raw.length){
        DATA = normalizeData(raw);
        startSession();
        return;
      }
      if(Date.now() - t0 >= maxMs){
        console.warn("[gamegr3] No data found in shuffledPairs | pairs | vocabulary within timeout");
        setQuestion("Данные не найдены. Подключите массив карточек.");
        return;
      }
      setTimeout(tick, 200);
    })();
  }

  document.addEventListener("DOMContentLoaded", () => attemptAutoStart(10000));

  // Controls
  if (hintBtn) hintBtn.addEventListener("click", () => {
    if(!currentItem) return;
    const buttons = $$(".option-btn");
    if (buttons.length > 2) {
      let disabled = 0;
      for (const b of buttons) {
        if (normalize(b.textContent) !== normalize(currentItem.correct)) { b.disabled = true; disabled++; }
        if (disabled >= 2) break;
      }
    } else {
      setQuestion(`${currentItem.main} (подсказка: ${String(currentItem.correct).slice(0,1)}...)`);
    }
  });
  if (restartBtn) restartBtn.addEventListener("click", startSession);
  if (nextBtn) nextBtn.addEventListener("click", nextQuestion);

})();