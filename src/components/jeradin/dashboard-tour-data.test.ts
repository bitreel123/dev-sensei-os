import { test } from "node:test";
import { strict as assert } from "node:assert";
import { anatomyStep } from "./anatomy-timing";
import { pathogenTour, researchTour } from "./dashboard-tour-data";

test("research anatomy starts at lungs and advances automatically through its own organs", () => {
  assert.equal(researchTour[anatomyStep(0, researchTour.length)]?.organ, "Lungs");
  assert.equal(researchTour[anatomyStep(10, researchTour.length)]?.organ, "Airways");
  assert.equal(researchTour[anatomyStep(20, researchTour.length)]?.organ, "Lymphatic system");
  assert.equal(researchTour[anatomyStep(40, researchTour.length)]?.organ, "Lungs");
});

test("malaria tour follows entry then liver then blood cells rather than the research tour", () => {
  assert.equal(pathogenTour[anatomyStep(0, pathogenTour.length)]?.organ, "Entry through skin");
  assert.equal(pathogenTour[anatomyStep(10, pathogenTour.length)]?.organ, "Liver");
  assert.equal(pathogenTour[anatomyStep(20, pathogenTour.length)]?.organ, "Red blood cells");
  assert.equal(pathogenTour[anatomyStep(30, pathogenTour.length)]?.organ, "Spleen");
});