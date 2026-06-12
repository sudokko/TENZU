/* 決定的乱数（seeded LCG）。SkuPrintPreview の実装を移設・数値 seed 対応を追加。
   同じ seed なら常に同じ列＝候補の再現性の根幹。 */

export function seededRng(seed: string | number) {
  let s = 0;
  const str = typeof seed === "number" ? `#${seed}` : seed;
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export type Rng = ReturnType<typeof seededRng>;

export function randInt(rnd: Rng, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

export function pick<T>(rnd: Rng, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
