/** 本のアンケート（/book/hajimete/bookenq・kdp-paperback §2.4）の設問。画面・受け口・管理画面で同じ定義を使う。
 * 巻の並びは catalog.ts の BOOK_VOLUMES（本と同じ順）。答えは選択肢の value で保存し、表示のときに label へ戻す。 */
import { BOOK_TASKS, BOOK_VOLUMES } from "./catalog";

export type Choice = { value: string; label: string };

/** 本の見出しと同じ書き方（Vol. は Lv.3・Lv.4 だけ）。 */
export const VOLUME_CHOICES: Choice[] = BOOK_VOLUMES.map((v) => ({
  value: v.sku,
  label: `${BOOK_TASKS[v.task].child} Lv.${v.lv}${v.lv >= 3 ? ` Vol.${v.vol}` : ""}（${v.from}〜${v.to}ばん）`,
}));

export const AGES: Choice[] = [
  { value: "pre", label: "年少より前" }, { value: "k1", label: "年少" }, { value: "k2", label: "年中" },
  { value: "k3", label: "年長" }, { value: "g1", label: "小1" }, { value: "g2", label: "小2以上" },
];
export const PROGRESS: Choice[] = [...VOLUME_CHOICES, { value: "done", label: "全部終わった" }];
/** 手が止まった巻。「なかった」も答えにする（止まらなかった家庭の数も知りたい）。 */
export const STUCK: Choice[] = [{ value: "none", label: "手が止まったところはなかった" }, ...VOLUME_CHOICES];
export const STUCK_WHY: Choice[] = [
  { value: "find", label: "欠けている所が見つからない" }, { value: "slant", label: "ななめの線が引けない" },
  { value: "count", label: "点を数えまちがえる" }, { value: "bored", label: "あきた" },
  { value: "explain", label: "親が説明しにくかった" }, { value: "other", label: "そのほか" },
];
export const REASONS: Choice[] = [
  { value: "steps", label: "6段階で少しずつ難しくなる" }, { value: "order", label: "「たす」から「うつす」へ進む順番" },
  { value: "pdf", label: "特典PDFでくり返し印刷できる" }, { value: "genre", label: "点図形（点描写）の問題集を探していた" },
  { value: "preview", label: "中身の見本を見て" }, { value: "price", label: "値段" },
  { value: "word", label: "人にすすめられて" }, { value: "other", label: "そのほか" },
];
export const COMMENT_MAX = 1000;

export type SurveyAnswer = {
  ages: string[];
  progress: string;
  stuck: string;
  /** 巻の中の番号（「（5／12）」の 5）。覚えていなければ無し。 */
  stuckNo?: number;
  stuckWhy: string[];
  comment?: string;
  reasons: string[];
  /** 知り合いのご家庭にすすめたいか（0〜10）。 */
  recommend: number;
  /** どこから来たか（本の QR は utm_content=p97、受取ページの帯は band）。 */
  from?: string;
};

const pick = (v: unknown, choices: Choice[]) => (typeof v === "string" && choices.some((c) => c.value === v) ? v : null);
const pickMany = (v: unknown, choices: Choice[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => pick(x, choices) !== null))] : [];

/** 受け口の検査。必須は「どこまで進んだか」と「すすめたいか」だけで、ほかは空でもよい。 */
export function parseSurvey(body: Record<string, unknown>): SurveyAnswer | string {
  const progress = pick(body.progress, PROGRESS);
  if (!progress) return "「どこまで進みましたか」を選んでください。";
  const recommend = typeof body.recommend === "number" && Number.isInteger(body.recommend) ? body.recommend : NaN;
  if (!(recommend >= 0 && recommend <= 10)) return "「すすめたいと思いますか」を0〜10から選んでください。";
  const stuck = pick(body.stuck, STUCK) ?? "";
  const stuckNo = stuck && stuck !== "none" && typeof body.stuckNo === "number" && Number.isInteger(body.stuckNo)
    && body.stuckNo >= 1 && body.stuckNo <= 12 ? body.stuckNo : undefined;
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, COMMENT_MAX) : "";
  const from = typeof body.from === "string" && /^[a-z0-9-]{1,16}$/.test(body.from) ? body.from : undefined;
  return {
    ages: pickMany(body.ages, AGES), progress, stuck, ...(stuckNo ? { stuckNo } : {}),
    stuckWhy: stuck && stuck !== "none" ? pickMany(body.stuckWhy, STUCK_WHY) : [],
    ...(comment ? { comment } : {}), reasons: pickMany(body.reasons, REASONS), recommend, ...(from ? { from } : {}),
  };
}

export const labelOf = (choices: Choice[], value: string) => choices.find((c) => c.value === value)?.label ?? value;
