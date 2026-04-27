export const STATES = ["Empty", "Seedling", "YoungTree", "MatureTree", "GiantTree"];

export const CONFIG = {
  gridSize: 9,
  tickMs: 100,
  clickStimulusBase: 12,
  clickOverchargeBase: 10,
  heatPerClickBase: 8,
  heatDecayPerSec: 10,
  damageThreshold: 100,
  goldMutationChance: 0.12,
  baseReward: 20,
  giantOverchargeThreshold: 150,
};

export function stateIndex(state) {
  return STATES.indexOf(state);
}

export function createTree() {
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

export function growthMultiplier(state) {
  return ({ Seedling: 0.6, YoungTree: 0.9, MatureTree: 1.2, GiantTree: 1.6 }[state] || 1);
}

export function overchargeMultiplier(overcharge) {
  return 1 + Math.min(1.5, (overcharge / 100) * 0.8) + Math.max(0, overcharge - 100) * 0.005;
}

export function mutationMultiplier(tree) {
  return tree.mutationType === "Gold" ? 2.5 : 1;
}

export function damageMultiplier(tree) {
  return tree.isDamaged ? 0.7 : 1;
}

export function expectedReward(tree) {
  const reward = tree.baseReward * growthMultiplier(tree.state) * overchargeMultiplier(tree.overcharge) * mutationMultiplier(tree) * damageMultiplier(tree);
  return Math.floor(reward);
}

export function damageChance(tree) {
  if (tree.heat < CONFIG.damageThreshold) return 0;
  const fromHeat = (tree.heat - 90) / 120;
  const fromInstability = tree.instability / 500;
  return Math.max(0, Math.min(0.6, fromHeat + fromInstability));
}

export function canHarvest(tree) {
  return stateIndex(tree.state) >= stateIndex("MatureTree");
}

export function shouldAdvanceToGiant(tree) {
  return tree.state === "MatureTree" && tree.overcharge >= CONFIG.giantOverchargeThreshold;
}
