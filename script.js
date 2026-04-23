const objectSets = [
  { icon: "🍎", label: "사과", unit: "개" },
  { icon: "🍓", label: "딸기", unit: "개" },
  { icon: "🍌", label: "바나나", unit: "개" },
];

const animalSets = [
  { icon: "🐰", label: "토끼", unit: "마리" },
  { icon: "🐶", label: "강아지", unit: "마리" },
  { icon: "🦆", label: "오리", unit: "마리" },
  { icon: "🐱", label: "고양이", unit: "마리" },
];

const questionEl = document.getElementById("question");
const itemsEl = document.getElementById("items");
const choicesEl = document.getElementById("choices");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const roundEl = document.getElementById("round");
const streakEl = document.getElementById("streak");
const nextBtn = document.getElementById("nextBtn");
const newGameBtn = document.getElementById("newGameBtn");
const levelSelect = document.getElementById("levelSelect");
const modeSelect = document.getElementById("modeSelect");

const praiseMessages = [
  "정답! 정말 잘했어요 🎉",
  "멋져요! 숫자 박사네요 ⭐",
  "와! 정확해요 👏",
  "최고예요! 계속 가볼까요? 🚀",
];

const state = {
  answer: "",
  score: 0,
  round: 0,
  streak: 0,
  answered: false,
};

const ranges = {
  easy: { min: 1, max: 5 },
  normal: { min: 1, max: 9 },
  hard: { min: 1, max: 12 },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(values) {
  return values[randomInt(0, values.length - 1)];
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function currentRange() {
  return ranges[levelSelect.value] ?? ranges.normal;
}

function updateProgress() {
  scoreEl.textContent = String(state.score);
  roundEl.textContent = String(state.round);
  streakEl.textContent = String(state.streak);
}

function disableChoices(disabled) {
  [...choicesEl.children].forEach((btn) => {
    btn.disabled = disabled;
  });
}

function renderChoices(options, onClick) {
  choicesEl.innerHTML = "";
  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = option;
    btn.addEventListener("click", () => onClick(btn, option));
    choicesEl.appendChild(btn);
  });
}

function highlightCorrectAnswer() {
  [...choicesEl.children].forEach((choiceBtn) => {
    if (choiceBtn.textContent === String(state.answer)) {
      choiceBtn.classList.add("correct");
    }
  });
}

function handleAnswer(selectedBtn, chosenValue) {
  if (state.answered) return;

  state.answered = true;
  state.round += 1;

  if (String(chosenValue) === String(state.answer)) {
    state.score += 1;
    state.streak += 1;
    feedbackEl.textContent = pickOne(praiseMessages);
    selectedBtn.classList.add("correct");
  } else {
    state.streak = 0;
    selectedBtn.classList.add("wrong");
    feedbackEl.textContent = `아쉬워요! 정답은 ${state.answer} 이에요.`;
    highlightCorrectAnswer();
  }

  disableChoices(true);
  updateProgress();
}

function buildCountQuestion() {
  const group = Math.random() > 0.5 ? objectSets : animalSets;
  const picked = pickOne(group);
  const { min, max } = currentRange();
  const answer = randomInt(min, max);

  questionEl.textContent = `${picked.label}는 몇 ${picked.unit}일까요?`;
  itemsEl.textContent = picked.icon.repeat(answer);
  state.answer = answer;

  const options = new Set([answer]);
  while (options.size < 3) {
    options.add(randomInt(min, max));
  }

  renderChoices(shuffle([...options]), handleAnswer);
}

function buildCompareQuestion() {
  const left = pickOne([...objectSets, ...animalSets]);
  const right = pickOne([...objectSets, ...animalSets]);
  const { min, max } = currentRange();

  let leftCount = randomInt(min, max);
  let rightCount = randomInt(min, max);

  while (leftCount === rightCount) {
    rightCount = randomInt(min, max);
  }

  const leftLabel = `${left.label} (${leftCount})`;
  const rightLabel = `${right.label} (${rightCount})`;

  questionEl.textContent = "누가 더 많을까요?";
  itemsEl.textContent = `${left.icon.repeat(leftCount)}\nVS\n${right.icon.repeat(rightCount)}`;

  state.answer = leftCount > rightCount ? leftLabel : rightLabel;
  renderChoices(shuffle([leftLabel, rightLabel, "같아요"]), handleAnswer);
}

function renderQuestion() {
  state.answered = false;
  feedbackEl.textContent = "";
  disableChoices(false);

  if (modeSelect.value === "compare") {
    buildCompareQuestion();
    return;
  }

  buildCountQuestion();
}

function resetGame() {
  state.answer = "";
  state.score = 0;
  state.round = 0;
  state.streak = 0;
  state.answered = false;
  updateProgress();
  renderQuestion();
}

nextBtn.addEventListener("click", renderQuestion);
newGameBtn.addEventListener("click", resetGame);
modeSelect.addEventListener("change", renderQuestion);
levelSelect.addEventListener("change", renderQuestion);

updateProgress();
renderQuestion();
