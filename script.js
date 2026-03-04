/* ============================================================
   FLASHCARD STUDY APP — JAVASCRIPT
   ============================================================
   HOW IT WORKS (overview):
   1.  On load, we fetch flashcards.json and store all cards.
   2.  The app has two modes: QUIZ and FLASHCARD.
   3.  QUIZ MODE:
       - Randomly picks 10 non-repeating questions.
       - User can type an answer or click "Reveal Answer".
       - After seeing the answer they mark Correct / Incorrect.
       - Score is tracked and saved to localStorage.
   4.  FLASHCARD MODE:
       - Shows all cards one by one.
       - Clicking the card flips it to reveal the answer.
       - Previous / Next / Shuffle buttons navigate the deck.
   ============================================================ */


/* ── DOM REFERENCES ─────────────────────────────────────────── */

// Screens
const homeScreen    = document.getElementById('home-screen');
const quizScreen    = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const fcScreen      = document.getElementById('fc-screen');

// Header elements
const toggleQuizBtn = document.getElementById('toggle-quiz');
const toggleFCBtn   = document.getElementById('toggle-fc');

// Home screen
const deckCountEl   = document.getElementById('deck-count');
const lastScoreEl   = document.getElementById('last-score');
const startQuizBtn  = document.getElementById('start-quiz-btn');
const browseFCBtn   = document.getElementById('browse-fc-btn');

// Quiz screen
const progressFill  = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const questionNum   = document.getElementById('question-num');
const correctCount  = document.getElementById('correct-count');
const incorrectCount= document.getElementById('incorrect-count');
const quizCardText  = document.getElementById('quiz-card-text');
const userAnswerEl  = document.getElementById('user-answer');
const revealBtn     = document.getElementById('reveal-btn');
const revealedBox   = document.getElementById('revealed-answer');
const revealedText  = document.getElementById('revealed-text');
const judgeSection  = document.getElementById('judge-section');
const btnCorrect    = document.getElementById('btn-correct');
const btnIncorrect  = document.getElementById('btn-incorrect');

// Results screen
const bigScore      = document.getElementById('big-score');
const bigPct        = document.getElementById('big-pct');
const resCorrect    = document.getElementById('res-correct');
const resIncorrect  = document.getElementById('res-incorrect');
const newQuizBtn    = document.getElementById('new-quiz-btn');
const goHomeBtn     = document.getElementById('go-home-btn');

// Flashcard screen
const fcCounter     = document.getElementById('fc-counter');
const fcCard        = document.getElementById('fc-card');
const fcQuestionEl  = document.getElementById('fc-question');
const fcAnswerEl    = document.getElementById('fc-answer');
const fcPrevBtn     = document.getElementById('fc-prev');
const fcNextBtn     = document.getElementById('fc-next');
const fcShuffleBtn  = document.getElementById('fc-shuffle');
const fcHomeBtn     = document.getElementById('fc-home-btn');


/* ── APP STATE ───────────────────────────────────────────────── */

let allCards   = [];   // full deck loaded from JSON
let quizCards  = [];   // 10 randomly selected cards for current quiz
let fcCards    = [];   // deck used in flashcard mode (shuffleable copy)

let quizIndex  = 0;    // which question we're on (0–9)
let correct    = 0;    // correct answers this round
let incorrect  = 0;    // incorrect answers this round
let revealed   = false;// whether the answer has been revealed yet

let fcIndex    = 0;    // current card in flashcard mode


/* ── CONSTANTS ───────────────────────────────────────────────── */

const QUIZ_LENGTH = 10;   // how many questions per quiz round


/* ── LOAD DATA ───────────────────────────────────────────────── */

/**
 * Fetches flashcards.json and initialises the app.
 * Using fetch() is the standard modern way to load external files in JS.
 */
async function loadCards() {
  try {
    const res  = await fetch('flashcards.json');
    allCards   = await res.json();
    fcCards    = [...allCards];   // start with unshuffled copy
    deckCountEl.textContent = allCards.length;
    loadLastScore();
  } catch (err) {
    // If the file can't be loaded (e.g. opened as file:// without a server)
    // show a helpful message.
    deckCountEl.textContent = '0';
    document.getElementById('deck-info').innerHTML =
      '<p style="color:var(--danger)">⚠️ Could not load flashcards.json.<br>' +
      'Please run the app through a local server (see README).</p>';
    console.error('Failed to load flashcards.json:', err);
  }
}


/* ── LOCAL STORAGE ───────────────────────────────────────────── */

/** Saves the latest quiz score to the browser's localStorage. */
function saveScore(score, total) {
  localStorage.setItem('lastScore', JSON.stringify({ score, total, date: new Date().toLocaleDateString() }));
}

/** Reads and displays the last saved score on the home screen. */
function loadLastScore() {
  const raw = localStorage.getItem('lastScore');
  if (!raw) return;
  const { score, total, date } = JSON.parse(raw);
  lastScoreEl.innerHTML = `Last quiz: <span>${score}/${total}</span> on ${date}`;
}


/* ── UTILITY FUNCTIONS ───────────────────────────────────────── */

/**
 * Fisher-Yates shuffle — returns a NEW shuffled copy of an array.
 * This is the standard algorithm for unbiased random shuffling.
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shows one screen, hides all others. */
function showScreen(screen) {
  [homeScreen, quizScreen, resultsScreen, fcScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

/** Switches the header mode toggle visual state. */
function setToggle(mode) {
  // mode is 'quiz' or 'fc'
  toggleQuizBtn.classList.toggle('active', mode === 'quiz');
  toggleFCBtn.classList.toggle('active', mode === 'fc');
}


/* ── QUIZ MODE ───────────────────────────────────────────────── */

/** Starts a new quiz round: shuffle, pick 10, reset state. */
function startQuiz() {
  if (allCards.length === 0) return;

  // Randomly select QUIZ_LENGTH cards (no repeats because we shuffle then slice)
  quizCards  = shuffle(allCards).slice(0, Math.min(QUIZ_LENGTH, allCards.length));
  quizIndex  = 0;
  correct    = 0;
  incorrect  = 0;

  setToggle('quiz');
  showScreen(quizScreen);
  renderQuizQuestion();
}

/** Renders the current quiz question and resets UI to pre-reveal state. */
function renderQuizQuestion() {
  const card = quizCards[quizIndex];

  // Update progress bar
  const progress = (quizIndex / quizCards.length) * 100;
  progressFill.style.width  = progress + '%';
  progressLabel.textContent = `Question ${quizIndex + 1} of ${quizCards.length}`;
  questionNum.textContent   = quizIndex + 1;

  // Update score chips
  correctCount.textContent   = correct;
  incorrectCount.textContent = incorrect;

  // Set card question text
  quizCardText.textContent = card.question;

  // Reset the reveal / judge UI to hidden state
  userAnswerEl.value     = '';
  revealedBox.style.display = 'none';
  judgeSection.classList.add('hidden');
  revealBtn.classList.remove('hidden');
  revealed = false;
}

/** Reveals the correct answer and shows the Correct/Incorrect buttons. */
function revealAnswer() {
  if (revealed) return;
  revealed = true;

  const card = quizCards[quizIndex];
  revealedText.textContent      = card.answer;
  revealedBox.style.display     = 'block';
  judgeSection.classList.remove('hidden');
  revealBtn.classList.add('hidden');
}

/** Records a correct or incorrect mark and advances to next question. */
function judge(wasCorrect) {
  if (wasCorrect) correct++;
  else incorrect++;

  quizIndex++;

  if (quizIndex >= quizCards.length) {
    showResults();
  } else {
    renderQuizQuestion();
  }
}

/** Builds and shows the results screen after all questions are answered. */
function showResults() {
  const pct = Math.round((correct / quizCards.length) * 100);

  bigScore.textContent = `${correct}/${quizCards.length}`;
  bigPct.textContent   = `${pct}% — ${getRating(pct)}`;
  resCorrect.textContent   = correct;
  resIncorrect.textContent = incorrect;

  // Colour the score based on performance
  bigScore.className = 'big-score';
  if (pct < 50)       bigScore.classList.add('low');
  else if (pct < 75)  bigScore.classList.add('mid');

  // Update progress bar to 100%
  progressFill.style.width  = '100%';
  progressLabel.textContent = 'Complete!';

  saveScore(correct, quizCards.length);
  loadLastScore();

  showScreen(resultsScreen);
}

/** Returns a short motivational label based on percentage score. */
function getRating(pct) {
  if (pct === 100) return 'Perfect!';
  if (pct >= 80)   return 'Great work';
  if (pct >= 60)   return 'Good effort';
  if (pct >= 40)   return 'Keep studying';
  return 'Needs revision';
}


/* ── FLASHCARD MODE ──────────────────────────────────────────── */

/** Opens flashcard mode showing the first card. */
function startFlashcards() {
  fcIndex = 0;
  fcCard.classList.remove('flipped');  // make sure we start on the question side
  setToggle('fc');
  showScreen(fcScreen);
  renderFlashcard();
}

/** Renders the current flashcard (no flip). */
function renderFlashcard() {
  const card = fcCards[fcIndex];
  fcQuestionEl.textContent = card.question;
  fcAnswerEl.textContent   = card.answer;
  fcCounter.textContent    = `${fcIndex + 1} / ${fcCards.length}`;

  // Reset to front face on every navigation
  fcCard.classList.remove('flipped');
}

/** Flips the flashcard to show the answer (or back to question). */
function flipCard() {
  fcCard.classList.toggle('flipped');
}

/** Moves to the next flashcard (wraps around). */
function fcNext() {
  fcIndex = (fcIndex + 1) % fcCards.length;
  renderFlashcard();
}

/** Moves to the previous flashcard (wraps around). */
function fcPrev() {
  fcIndex = (fcIndex - 1 + fcCards.length) % fcCards.length;
  renderFlashcard();
}

/** Shuffles the flashcard deck and starts from card 1. */
function fcShuffle() {
  fcCards = shuffle(fcCards);
  fcIndex = 0;
  renderFlashcard();
}


/* ── EVENT LISTENERS ─────────────────────────────────────────── */

// Mode toggle buttons in the header
toggleQuizBtn.addEventListener('click', () => {
  setToggle('quiz');
  showScreen(homeScreen);
});

toggleFCBtn.addEventListener('click', () => {
  setToggle('fc');
  startFlashcards();
});

// Home screen buttons
startQuizBtn.addEventListener('click', startQuiz);
browseFCBtn.addEventListener('click',  startFlashcards);

// Quiz buttons
revealBtn.addEventListener('click',     revealAnswer);
btnCorrect.addEventListener('click',   () => judge(true));
btnIncorrect.addEventListener('click', () => judge(false));

// Results buttons
newQuizBtn.addEventListener('click', startQuiz);
goHomeBtn.addEventListener('click',  () => { showScreen(homeScreen); setToggle('quiz'); });

// Flashcard buttons
fcCard.addEventListener('click',      flipCard);
fcNextBtn.addEventListener('click',   fcNext);
fcPrevBtn.addEventListener('click',   fcPrev);
fcShuffleBtn.addEventListener('click', fcShuffle);
fcHomeBtn.addEventListener('click',   () => { showScreen(homeScreen); setToggle('quiz'); });


/* ── KEYBOARD SHORTCUTS ──────────────────────────────────────── */
/*
   QUIZ MODE:
     Space       → Reveal answer (if not yet revealed)
     1           → Mark as Correct
     2           → Mark as Incorrect

   FLASHCARD MODE:
     Space / ↑   → Flip card
     → or L      → Next card
     ← or J      → Previous card
*/
document.addEventListener('keydown', e => {
  // Don't fire shortcuts while typing in the answer textarea
  if (document.activeElement === userAnswerEl) return;

  // --- QUIZ shortcuts ---
  if (quizScreen.classList.contains('active')) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!revealed) revealAnswer();
    }
    if (e.key === '1' && revealed) judge(true);
    if (e.key === '2' && revealed) judge(false);
  }

  // --- FLASHCARD shortcuts ---
  if (fcScreen.classList.contains('active')) {
    if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); flipCard(); }
    if (e.key === 'ArrowRight' || e.key === 'l')   fcNext();
    if (e.key === 'ArrowLeft'  || e.key === 'j')   fcPrev();
  }
});


/* ── INITIALISE ──────────────────────────────────────────────── */

// Load cards and show the home screen when the page is ready
loadCards();
showScreen(homeScreen);
setToggle('quiz');
