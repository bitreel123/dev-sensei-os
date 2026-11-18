export const ORGAN_SECONDS = 10;
export function anatomyStep(seconds: number, count: number) {
  if (count <= 0) return 0;
  return Math.floor(Math.max(0, seconds) / ORGAN_SECONDS) % count;
}