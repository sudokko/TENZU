/* =========================================================================
   /products/[slug] ディスパッチャ
   - slug がタスク（copy/mirror/…）→ タスク別一覧（TaskListPage）
   - slug が live SKU（copy-lv2-vol2 等）→ 商品詳細（SkuDetailPage）
   - 旧グリッド表記 slug（copy-lv2-4x4）→ 正本 SKU へリダイレクト
   scaffold SKU は params に含めない＝404（商品ページなし）。
   ========================================================================= */

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  PRODUCT_TASKS, SKU_ALIASES, taskBySlug, volBySku, volTitle, PRICE, QUESTIONS_PER_VOL,
} from "../data";
import TaskListPage from "../TaskListPage";
import SkuDetailPage from "../SkuDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...PRODUCT_TASKS.map((t) => ({ slug: t.slug })),
    ...PRODUCT_TASKS.flatMap((t) =>
      t.vols.filter((x) => x.status === "live").map((x) => ({ slug: x.sku }))),
    ...Object.keys(SKU_ALIASES).map((slug) => ({ slug })),
  ];
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const task = taskBySlug(slug);
  if (task) {
    return {
      title: `${task.name} の一覧 — 全 ${task.vols.length} 巻 · TENZU`,
      description: `点描写「${task.name}」をレベル別に全 ${task.vols.length} 巻。1 冊 ${QUESTIONS_PER_VOL} 問・¥${PRICE} 一律・PDF ダウンロード。`,
    };
  }
  const hit = volBySku(SKU_ALIASES[slug] ?? slug);
  if (hit) {
    return {
      title: `${volTitle(hit.task, hit.vol)} · TENZU`,
      description: `${hit.vol.blurb} A4 縦・${QUESTIONS_PER_VOL} 問・¥${PRICE} 一律。`,
    };
  }
  return {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const alias = SKU_ALIASES[slug];
  if (alias) permanentRedirect(`/products/${alias}`);

  const task = taskBySlug(slug);
  if (task) return <TaskListPage task={task} />;

  const hit = volBySku(slug);
  if (hit && hit.vol.status === "live") return <SkuDetailPage task={hit.task} vol={hit.vol} />;

  notFound();
}
