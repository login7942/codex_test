const STATES = ["Empty", "Seedling", "YoungTree", "MatureTree", "GiantTree"];

const CONFIG = {
  gridSize: 9,
  tickMs: 100,
  clickStimulusBase: 12,
  clickOverchargeBase: 10,
  heatPerClickBase: 8,
  heatDecayPerSec: 10,
  damageThreshold: 100,
  goldMutationChance: 0.12,
  baseReward: 20,
};

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

function createTree() {
  return {
    state: "Empty",
    growthProgress: 0,
    tapStimulus: 0,
    overcharge: 0,
    heat: 0,
    instability: 0,
    baseReward: CONFIG.baseReward,
    isMutated: false,
    mutationType: "Normal",
    isDamaged: false,
    damageTimer: 0,
  };
}

function init() {
  game.trees = Array.from({ length: CONFIG.gridSize }, () => createTree());
  drawGrid();
  drawUpgrades();
  bindUI();
  setInterval(tick, CONFIG.tickMs);
}

function bindUI() {
  document.getElementById("plantBtn").addEventListener("click", plantSeedling);
  document.getElementById("harvestBtn").addEventListener("click", harvestSelected);
}

function plantSeedling() {
  const idx = game.trees.findIndex((t) => t.state === "Empty");
  if (idx === -1) return;
  game.trees[idx].state = "Seedling";
  game.trees[idx].growthProgress = 10;
  render();
}

function stateIndex(state) {
  return STATES.indexOf(state);
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
    }
  } else {
    tree.overcharge += clickOvercharge;
    const instabilityFactor = tree.mutationType === "Gold" ? 1.4 : 1;
    tree.instability += (1 + tree.overcharge / 120) * instabilityFactor;
  }

  maybeDamage(tree);
  render();
}

function maybeDamage(tree) {
  if (tree.heat < CONFIG.damageThreshold) return;
  const chance = Math.min(0.35, (tree.heat - 90) / 100);
  if (Math.random() < chance) {
    tree.isDamaged = true;
    tree.damageTimer = 4;
  }
}

function growthMultiplier(state) {
  return ({ Seedling: 0.6, YoungTree: 0.9, MatureTree: 1.2, GiantTree: 1.6 }[state] || 1);
}

function overchargeMultiplier(overcharge) {
  return 1 + Math.min(1.5, (overcharge / 100) * 0.8) + Math.max(0, overcharge - 100) * 0.005;
}

function mutationMultiplier(tree) {
  return tree.mutationType === "Gold" ? 2.5 : 1;
}

function damageMultiplier(tree) {
  return tree.isDamaged ? 0.7 : 1;
}

function expectedReward(tree) {
  const reward = tree.baseReward * growthMultiplier(tree.state) * overchargeMultiplier(tree.overcharge) * mutationMultiplier(tree) * damageMultiplier(tree);
  return Math.floor(reward);
}

function harvest(index) {
  const tree = game.trees[index];
  if (stateIndex(tree.state) < stateIndex("MatureTree")) return;
  game.wood += expectedReward(tree);
  game.trees[index] = createTree();
  if (game.selectedIndex === index) game.selectedIndex = null;
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
      const autoChance = 0.01 * game.upgrades.lumberjack;
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
  const autoIncome = (game.upgrades.lumberjack * 1.3 + game.upgrades.sprinkler * 0.6).toFixed(1);
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

    const rewardPreview = stateIndex(tree.state) >= stateIndex("MatureTree") ? ` | 예상 ${expectedReward(tree)}` : "";
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
    `예상 수확: ${stateIndex(tree.state) >= stateIndex("MatureTree") ? expectedReward(tree) : 0}`,
  ].join(" | ");

  harvestBtn.disabled = stateIndex(tree.state) < stateIndex("MatureTree");
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
