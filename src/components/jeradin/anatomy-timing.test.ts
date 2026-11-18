import { test } from "node:test";
import { strict as assert } from "node:assert";
import { anatomyStep, ORGAN_SECONDS } from "./anatomy-timing";
test("each organ walkthrough lasts ten seconds before advancing", () => {
  assert.equal(ORGAN_SECONDS, 10);
  assert.equal(anatomyStep(9.99, 11), 0);
  assert.equal(anatomyStep(10, 11), 1);
  assert.equal(anatomyStep(20, 11), 2);
  assert.equal(anatomyStep(110, 11), 0);
});