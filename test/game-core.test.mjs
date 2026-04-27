import assert from "node:assert/strict";
import {
  canHarvest,
  createTree,
  damageChance,
  expectedReward,
  overchargeMultiplier,
  shouldAdvanceToGiant,
} from "../game-core.js";

{
  const tree = createTree();
  tree.state = "MatureTree";
  tree.overcharge = 100;
  const reward = expectedReward(tree);
  assert.equal(reward, 43, "기본 성목 과충전 100 보상 계산");
}

{
  const tree = createTree();
  tree.state = "MatureTree";
  tree.overcharge = 160;
  assert.equal(shouldAdvanceToGiant(tree), true, "과충전 150 이상이면 거대나무 전환 가능");
}

{
  const tree = createTree();
  tree.state = "YoungTree";
  assert.equal(canHarvest(tree), false, "어린나무는 수확 불가");
  tree.state = "MatureTree";
  assert.equal(canHarvest(tree), true, "성목은 수확 가능");
}

{
  const tree = createTree();
  tree.heat = 105;
  tree.instability = 30;
  assert.ok(damageChance(tree) > 0, "임계 열기/불안정이면 손상 확률 증가");
}

{
  assert.equal(overchargeMultiplier(0), 1, "과충전 0 배율 검증");
  assert.ok(overchargeMultiplier(150) > overchargeMultiplier(100), "과충전 증가에 따라 배율 증가");
}

console.log("game-core tests passed");
