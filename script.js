import {
  CONFIG,
  STATES,
  canHarvest,
  createTree,
  damageChance,
  expectedReward,
  shouldAdvanceToGiant,
  stateIndex,
} from "./game-core.js";

const SAVE_KEY = "growing-tree-clicker-save-v2";

const stateEmoji = {
  Empty: "⬜",
  Seedling: "🌱",
  YoungTree: "🌿",
  MatureTree: "🌳",
  GiantTree: "🌲",
};

const game = {
  wood: 0,
  selectedIndex: null,
  trees: [],
  upgrades: {
    glove: 0,
    hammer: 0,
    sprinkler: 0,
    heatControl: 0,
    lumberjack: 0,
  },
};

const upgradeDefs = [
  { key: "glove", name: "튼튼한 장갑", baseCost: 30, desc: "클릭당 성장 자극 증가", costMult: 1.6 },
  { key: "hammer", name: "나무 망치", baseCost: 45, desc: "과충전 보상 증가", costMult: 1.7 },
  { key: "sprinkler", name: "좋은 물뿌리개", baseCost: 50, desc: "자동 성장 속도 증가", costMult: 1.8 },
  { key: "heatControl", name: "열기 조절 장갑", baseCost: 40, desc: "클릭 시 열기 증가 감소", costMult: 1.65 },
  { key: "lumberjack", name: "견습 목수", baseCost: 80, desc: "낮은 단계 나무 자동 수확", costMult: 2.0 },
];

function init() {
  loadGame();
  if (!game.trees.length) {
    game.trees = Array.from({ length: CONFIG.gridSize }, () => createTree());
  }

  drawGrid();
  drawUpgrades();
  bindUI();
  render();
  setInterval(tick, CONFIG.tickMs);
  setInterval(saveGame, 3000);
}

function bindUI() {
  document.getElementById("plantBtn").addEventListener("click", plantSeedling);
  document.getElementById("harvestBtn").addEventListener("click", harvestSelected);
  document.getElementById("saveBtn").addEventListener("click", saveGame);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
}

function setToast(text) {
  document.getElementById("toast").textContent = text;
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  setToast("저장 완료");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(game, parsed);
    if (!Array.isArray(game.trees) || game.trees.length !== CONFIG.gridSize) {
      game.trees = Array.from({ length: CONFIG.gridSize }, () => createTree());
    }
  } catch {
    game.trees = Array.from({ length: CONFIG.gridSize }, () => createTree());
  }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  game.wood = 0;
  game.selectedIndex = null;
  game.upgrades = { glove: 0, hammer: 0, sprinkler: 0, heatControl: 0, lumberjack: 0 };
  game.trees = Array.from({ length: CONFIG.gridSize }, () => createTree());
  render();
  setToast("초기화 완료");
}

function plantSeedling() {
  const idx = game.trees.findIndex((t) => t.state === "Empty");
  if (idx === -1) {
    setToast("빈칸이 없습니다.");
    return;
  }

  game.trees[idx].state = "Seedling";
  game.trees[idx].growthProgress = 10;
  setToast(`묘목 심기: 칸 ${idx + 1}`);
  render();
}

function advanceState(tree) {
  const current = stateIndex(tree.state);
  if (current <= 0 || current >= STATES.length - 1) return;
  tree.state = STATES[current + 1];
  tree.tapStimulus = 0;
  tree.growthProgress = 0;
  if (tree.state === "MatureTree" && Math.random() < CONFIG.goldMutationChance) {
    tree.isMutated = true;
    tree.mutationType = "Gold";
  }
}

function clickTree(index) {
  const tree = game.trees[index];
  game.selectedIndex = index;
  if (tree.state === "Empty") {
    render();
    return;
  }

  const clickStimulus = CONFIG.clickStimulusBase * (1 + game.upgrades.glove * 0.1) * (tree.isDamaged ? 0.8 : 1);
  const clickOvercharge = CONFIG.clickOverchargeBase * (1 + game.upgrades.hammer * 0.12) * (tree.isDamaged ? 0.8 : 1);
  const heatGain = CONFIG.heatPerClickBase * (1 - game.upgrades.heatControl * 0.08);

  tree.heat += Math.max(1.5, heatGain);

  if (stateIndex(tree.state) < stateIndex("MatureTree")) {
    tree.tapStimulus += clickStimulus;
    tree.growthProgress = Math.min(100, tree.growthProgress + clickStimulus * 0.35);
    if (tree.tapStimulus >= 100) {
      advanceState(tree);
      setToast("성장 폭주! 단계 상승");
    }
  } else {
    tree.overcharge += clickOvercharge;
    const instabilityFactor = tree.mutationType === "Gold" ? 1.45 : 1;
    tree.instability = Math.min(100, tree.instability + (1 + tree.overcharge / 120) * instabilityFactor);

    if (shouldAdvanceToGiant(tree)) {
      tree.state = "GiantTree";
      setToast("거대나무로 성장!");
    }
  }

  maybeDamage(tree);
  render();
}

function maybeDamage(tree) {
  const chance = damageChance(tree);
  if (chance > 0 && Math.random() < chance) {
    tree.isDamaged = true;
    tree.damageTimer = 4;
    setToast("나무 손상! 보상 감소");
  }
}

function harvest(index) {
  const tree = game.trees[index];
  if (!canHarvest(tree)) return;

  const reward = expectedReward(tree);
  game.wood += reward;
  game.trees[index] = createTree();
  if (game.selectedIndex === index) game.selectedIndex = null;
  setToast(`쾅! +${reward} 목재`);
}

function harvestSelected() {
  if (game.selectedIndex === null) return;
  harvest(game.selectedIndex);
  render();
}

function tick() {
  const dt = CONFIG.tickMs / 1000;
  const autoGrowth = 2 + game.upgrades.sprinkler * 1.5;

  game.trees.forEach((tree, i) => {
    tree.heat = Math.max(0, tree.heat - CONFIG.heatDecayPerSec * dt);
    if (tree.damageTimer > 0) {
      tree.damageTimer -= dt;
      if (tree.damageTimer <= 0) tree.isDamaged = false;
    }

    if (stateIndex(tree.state) > 0 && stateIndex(tree.state) < stateIndex("MatureTree")) {
      tree.growthProgress += autoGrowth * dt;
      if (tree.growthProgress >= 100) {
        advanceState(tree);
      }
    }

    if (game.upgrades.lumberjack > 0 && ["Seedling", "YoungTree"].includes(tree.state)) {
      const autoChance = 0.003 * game.upgrades.lumberjack;
      if (Math.random() < autoChance) {
        game.wood += Math.floor(tree.baseReward * 0.5);
        game.trees[i] = createTree();
      }
    }
  });

  renderTopBar();
  drawSelected();
  updateGrid();
}

function getUpgradeCost(def) {
  return Math.floor(def.baseCost * def.costMult ** game.upgrades[def.key]);
}

function buyUpgrade(key) {
  const def = upgradeDefs.find((u) => u.key === key);
  const cost = getUpgradeCost(def);
  if (game.wood < cost) return;
  game.wood -= cost;
  game.upgrades[key] += 1;
  drawUpgrades();
  renderTopBar();
}

function renderTopBar() {
  document.getElementById("woodCount").textContent = Math.floor(game.wood);
  const autoIncome = (game.upgrades.lumberjack * 0.8 + game.upgrades.sprinkler * 0.4).toFixed(1);
  document.getElementById("autoIncome").textContent = autoIncome;
}

function drawGrid() {
  const grid = document.getElementById("grid");
  const tpl = document.getElementById("cellTemplate");
  grid.innerHTML = "";

  game.trees.forEach((_, i) => {
    const cell = tpl.content.firstElementChild.cloneNode(true);
    cell.addEventListener("click", () => clickTree(i));
    grid.appendChild(cell);
  });

  updateGrid();
}

function updateGrid() {
  const cells = [...document.querySelectorAll(".tree-cell")];
  game.trees.forEach((tree, i) => {
    const cell = cells[i];
    const visual = cell.querySelector(".tree-visual");
    const growthFill = cell.querySelector(".fill.growth");
    const overFill = cell.querySelector(".fill.overcharge");
    const heatFill = cell.querySelector(".fill.heat");
    const stateText = cell.querySelector(".state-text");

    visual.textContent = stateEmoji[tree.state] || "🌳";
    if (tree.mutationType === "Gold") visual.textContent = "✨🌳";
    growthFill.style.width = `${Math.min(100, tree.growthProgress)}%`;
    overFill.style.width = `${Math.min(100, tree.overcharge)}%`;
    heatFill.style.width = `${Math.min(100, tree.heat)}%`;

    cell.classList.toggle("hot", tree.heat >= 80);
    cell.classList.toggle("damaged", tree.isDamaged);
    cell.classList.toggle("selected", i === game.selectedIndex);

    const rewardPreview = canHarvest(tree) ? ` | 예상 ${expectedReward(tree)}` : "";
    const damageText = tree.isDamaged ? "손상" : "";
    stateText.textContent = `${tree.state}${tree.mutationType === "Gold" ? "(황금)" : ""} ${damageText}${rewardPreview}`.trim();
  });
}

function drawSelected() {
  const info = document.getElementById("selectedInfo");
  const harvestBtn = document.getElementById("harvestBtn");

  if (game.selectedIndex === null) {
    info.textContent = "나무를 선택하세요.";
    harvestBtn.disabled = true;
    return;
  }

  const tree = game.trees[game.selectedIndex];
  info.textContent = [
    `상태: ${tree.state}`,
    `성장자극: ${tree.tapStimulus.toFixed(0)}%`,
    `과충전: ${tree.overcharge.toFixed(0)}%`,
    `열기: ${tree.heat.toFixed(0)}%`,
    `불안정: ${tree.instability.toFixed(0)}%`,
    `예상 수확: ${canHarvest(tree) ? expectedReward(tree) : 0}`,
  ].join(" | ");

  harvestBtn.disabled = !canHarvest(tree);
}

function drawUpgrades() {
  const wrap = document.getElementById("upgradeList");
  wrap.innerHTML = "";

  upgradeDefs.forEach((def) => {
    const lv = game.upgrades[def.key];
    const cost = getUpgradeCost(def);
    const item = document.createElement("div");
    item.className = "upgrade-item";
    item.innerHTML = `
      <strong>${def.name} Lv.${lv}</strong>
      <div>${def.desc}</div>
      <button class="upgrade-buy" ${game.wood < cost ? "disabled" : ""}>구매 (${cost} 목재)</button>
    `;
    item.querySelector("button").addEventListener("click", () => buyUpgrade(def.key));
    wrap.appendChild(item);
  });
}

function render() {
  renderTopBar();
  updateGrid();
  drawSelected();
  drawUpgrades();
}

init();
