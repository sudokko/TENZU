/* eslint-disable */
/* =========================================================================
   AUTO-GENERATED — /api/atelier/publish が再生成する。手で編集しない。
   published/{sku}.json の静的レジストリ（SSG・クライアント双方で bundle される）
   ========================================================================= */
import type { SkuProblemSet } from "../schema";
import j0 from "./copy-lv1-vol1.json";
import j1 from "./copy-lv2-vol1.json";
import j2 from "./copy-lv3-vol1.json";
import j3 from "./copy-lv3-vol2.json";
import j4 from "./copy-lv4-vol1.json";
import j5 from "./copy-lv4-vol2.json";
import j6 from "./copy-lv5-vol1.json";
import j7 from "./fill-lv2-vol1.json";
import j8 from "./fill-lv3-vol1.json";
import j9 from "./fill-lv4-vol1.json";
import j10 from "./fill-lv5-vol1.json";
import j11 from "./mirror-lv2-vol1.json";
import j12 from "./mirror-lv3-vol1.json";
import j13 from "./mirror-lv4-vol1.json";
import j14 from "./mirror-lv5-vol1.json";
import j15 from "./rotate-lv2-vol1.json";
import j16 from "./rotate-lv3-vol1.json";
import j17 from "./rotate-lv3-vol2.json";
import j19 from "./solid-lv3-vol1.json";
import j20 from "./translate-lv2-vol1.json";
import j21 from "./translate-lv3-vol1.json";

export const PUBLISHED: Record<string, SkuProblemSet> = {
  "copy-lv1-vol1": j0 as unknown as SkuProblemSet,
  "copy-lv2-vol1": j1 as unknown as SkuProblemSet,
  "copy-lv3-vol1": j2 as unknown as SkuProblemSet,
  "copy-lv3-vol2": j3 as unknown as SkuProblemSet,
  "copy-lv4-vol1": j4 as unknown as SkuProblemSet,
  "copy-lv4-vol2": j5 as unknown as SkuProblemSet,
  "copy-lv5-vol1": j6 as unknown as SkuProblemSet,
  "fill-lv2-vol1": j7 as unknown as SkuProblemSet,
  "fill-lv3-vol1": j8 as unknown as SkuProblemSet,
  "fill-lv4-vol1": j9 as unknown as SkuProblemSet,
  "fill-lv5-vol1": j10 as unknown as SkuProblemSet,
  "mirror-lv2-vol1": j11 as unknown as SkuProblemSet,
  "mirror-lv3-vol1": j12 as unknown as SkuProblemSet,
  "mirror-lv4-vol1": j13 as unknown as SkuProblemSet,
  "mirror-lv5-vol1": j14 as unknown as SkuProblemSet,
  "rotate-lv2-vol1": j15 as unknown as SkuProblemSet,
  "rotate-lv3-vol1": j16 as unknown as SkuProblemSet,
  "rotate-lv3-vol2": j17 as unknown as SkuProblemSet,
  "solid-lv3-vol1": j19 as unknown as SkuProblemSet,
  "translate-lv2-vol1": j20 as unknown as SkuProblemSet,
  "translate-lv3-vol1": j21 as unknown as SkuProblemSet,
};

export function publishedSet(sku: string): SkuProblemSet | undefined {
  return PUBLISHED[sku];
}
