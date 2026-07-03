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
import j4 from "./copy-lv4-vol2.json";
import j5 from "./solid-lv3-vol1.json";

export const PUBLISHED: Record<string, SkuProblemSet> = {
  "copy-lv1-vol1": j0 as unknown as SkuProblemSet,
  "copy-lv2-vol1": j1 as unknown as SkuProblemSet,
  "copy-lv3-vol1": j2 as unknown as SkuProblemSet,
  "copy-lv3-vol2": j3 as unknown as SkuProblemSet,
  "copy-lv4-vol2": j4 as unknown as SkuProblemSet,
  "solid-lv3-vol1": j5 as unknown as SkuProblemSet,
};

export function publishedSet(sku: string): SkuProblemSet | undefined {
  return PUBLISHED[sku];
}
