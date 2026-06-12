/* eslint-disable */
/* =========================================================================
   AUTO-GENERATED — /api/atelier/publish が再生成する。手で編集しない。
   published/{sku}.json の静的レジストリ（SSG・クライアント双方で bundle される）
   ========================================================================= */
import type { SkuProblemSet } from "../schema";
import j0 from "./copy-lv1-vol1.json";

export const PUBLISHED: Record<string, SkuProblemSet> = {
  "copy-lv1-vol1": j0 as unknown as SkuProblemSet,
};

export function publishedSet(sku: string): SkuProblemSet | undefined {
  return PUBLISHED[sku];
}
