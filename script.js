(() => {
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));

  const defaultWords = [
    "javascript",
    "typescript",
    "variable",
    "function",
    "interface",
    "component",
    "lighthouse",
    "developer",
    "algorithm",
    "computer",
    "keyboard",
    "network",
    "internet",
    "database",
    "software",
    "hardware",
    "optimize",
    "graphics",
    "solution",
    "problem",
    "pipeline",
    "gradient",
    "response",
    "request",
    "program",
    "compile",
    "shipping",
    "package",
    "semantic",
    "cursor vibe",
    "artificial intelligence",
    "machine learning",
    "data science",
    "neural network",
    "cloud native",
    "microservice",
    "container",
    "observability",
    "resilience",
    "throughput"
  ];

  const els = {
    score: document.getElementById("score"),
    streak: document.getElementById("streak"),
    lives: document.getElementById("lives"),
    round: document.getElementById("round"),
    word: document.getElementById("word"),
    keys: document.getElementById("keys"),
    feedback: document.getElementById("feedback"),
    newRound: document.getElementById("new-round"),
    reset: document.getElementById("reset-game"),
    difficulty: document.getElementById("difficulty")
  };

  const state = {
    score: 0,
    streak: 0,
    lives: 5,
    round: 1,
    targetWord: "",
    revealedChars: new Set(),
    missingIndices: new Set(),
    guessedLetters: new Set(),
    gameOver: false
  };

  function setFeedback(text, tone = "neutral") {
    els.feedback.textContent = text;
    els.feedback.classList.remove("feedback--good", "feedback--bad", "feedback--warn");
    if (tone === "good") els.feedback.classList.add("feedback--good");
    if (tone === "bad") els.feedback.classList.add("feedback--bad");
    if (tone === "warn") els.feedback.classList.add("feedback--warn");
  }

  function updateStatus() {
    els.score.textContent = String(state.score);
    els.streak.textContent = String(state.streak);
    els.lives.textContent = String(state.lives);
    els.round.textContent = String(state.round);
  }

  function chooseWord() {
    const pool = defaultWords;
    const word = pool[Math.floor(Math.random() * pool.length)];
    return word.toLowerCase();
  }

  function computeMissingCount(word, difficulty) {
    const lettersOnly = word.replace(/[^a-z]/g, "");
    if (lettersOnly.length <= 2) return 1;
    const base = Math.max(1, Math.floor(lettersOnly.length / 3));
    if (difficulty === "easy") return Math.max(1, base - 1);
    if (difficulty === "hard") return Math.min(lettersOnly.length - 1, base + 2);
    return base + 1;
  }

  function newRound() {
    if (state.gameOver) {
      // reset soft lock if user tries to start again
      state.gameOver = false;
      state.lives = 5;
      state.streak = 0;
      state.score = 0;
      state.round = 1;
    }

    state.targetWord = chooseWord();
    state.revealedChars = new Set();
    state.missingIndices = new Set();
    state.guessedLetters = new Set();

    // determine which indices are missing
    const difficulty = els.difficulty.value;
    const missingCount = computeMissingCount(state.targetWord, difficulty);
    const lettersIndices = [];
    for (let i = 0; i < state.targetWord.length; i++) {
      if (/[a-z]/.test(state.targetWord[i])) lettersIndices.push(i);
    }
    // random unique indices to hide
    while (state.missingIndices.size < Math.min(missingCount, lettersIndices.length - 1)) {
      const idx = lettersIndices[Math.floor(Math.random() * lettersIndices.length)];
      state.missingIndices.add(idx);
    }

    renderWord();
    renderKeyboard();
    setFeedback("Guess the missing letters!");
    updateStatus();
  }

  function renderWord() {
    els.word.innerHTML = "";
    for (let i = 0; i < state.targetWord.length; i++) {
      const ch = state.targetWord[i];
      const isLetter = /[a-z]/.test(ch);
      const isMissing = state.missingIndices.has(i);
      const shown = isLetter && (!isMissing || state.revealedChars.has(i)) ? ch : "";

      const el = document.createElement("div");
      el.className = "char";
      if (!isLetter && ch === " ") el.classList.add("char--space");
      if (isMissing && !state.revealedChars.has(i)) el.classList.add("char--missing");
      if (isMissing && state.revealedChars.has(i)) el.classList.add("char--filled");
      el.setAttribute("aria-label", isLetter ? (shown ? ch : "missing letter") : "space");
      el.textContent = isLetter ? shown : (ch === " " ? "" : ch);
      els.word.appendChild(el);
    }
  }

  function renderKeyboard() {
    els.keys.innerHTML = "";
    letters.forEach((l) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key";
      btn.textContent = l;
      btn.setAttribute("aria-label", `Letter ${l}`);
      btn.disabled = state.guessedLetters.has(l);
      btn.addEventListener("click", () => handleGuess(l));
      els.keys.appendChild(btn);
    });
  }

  function updateKeyVisual(letter, isHit) {
    const buttons = Array.from(els.keys.querySelectorAll(".key"));
    const btn = buttons.find((b) => b.textContent === letter);
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add(isHit ? "key--good" : "key--bad");
  }

  function handleGuess(letter) {
    if (state.gameOver) return;
    if (state.guessedLetters.has(letter)) return;
    state.guessedLetters.add(letter);

    let hit = false;
    for (let i = 0; i < state.targetWord.length; i++) {
      const ch = state.targetWord[i];
      if (state.missingIndices.has(i) && ch === letter) {
        state.revealedChars.add(i);
        hit = true;
      }
    }

    updateKeyVisual(letter, hit);

    if (hit) {
      setFeedback(`Nice! The letter "${letter}" is in the word.`, "good");
      state.score += 10;
      if (isRoundComplete()) {
        state.streak += 1;
        state.score += 25; // round bonus
        setFeedback(`Great job! You completed the word: "${state.targetWord.toUpperCase()}". Press Enter for next round.`, "good");
        state.round += 1;
        lockAllKeys();
      }
    } else {
      setFeedback(`Nope! "${letter}" is not needed.`, "bad");
      state.lives -= 1;
      if (state.lives <= 0) {
        state.gameOver = true;
        setFeedback(`Game over! The word was "${state.targetWord.toUpperCase()}". Press Enter to restart.`, "bad");
        lockAllKeys();
      } else {
        state.streak = 0;
      }
    }

    renderWord();
    updateStatus();
  }

  function isRoundComplete() {
    return state.missingIndices.size > 0 && [...state.missingIndices].every((i) => state.revealedChars.has(i));
  }

  function lockAllKeys() {
    const buttons = Array.from(els.keys.querySelectorAll(".key"));
    buttons.forEach((b) => (b.disabled = true));
  }

  // Keyboard support
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "enter") {
      if (state.gameOver) {
        // Hard reset
        state.score = 0;
        state.streak = 0;
        state.lives = 5;
        state.round = 1;
        state.gameOver = false;
      }
      newRound();
      return;
    }
    if (/^[a-z]$/.test(key)) {
      handleGuess(key);
    }
  });

  // Buttons
  els.newRound.addEventListener("click", () => {
    newRound();
  });

  els.reset.addEventListener("click", () => {
    state.score = 0;
    state.streak = 0;
    state.lives = 5;
    state.round = 1;
    state.gameOver = false;
    newRound();
  });

  // Initialize keyboard and first round
  renderKeyboard();
  newRound();
})();


