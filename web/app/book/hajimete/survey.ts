/** 本のアンケート（/book/hajimete/bookenq・kdp-paperback §2.4）の設問。画面・受け口・管理画面で同じ定義を使う。
 * 答えは選択肢の value で保存し、表示のときに label へ戻す。 */

export type Choice = { value: string; label: string };

/** 1. 使ったお子さんの年齢（ラジオ・必須）。6才は小学校の入学前と後で分ける。 */
export const AGES: Choice[] = [
  { value: "a3", label: "3才以下" }, { value: "a4", label: "4才" }, { value: "a5", label: "5才" },
  { value: "a6pre", label: "6才（小学校入学前）" }, { value: "a6post", label: "6才（小学校入学後）" }, { value: "a7", label: "7才以上" },
];
/** 設問が「学年」だったころ（2026-10-27〜28）の選択肢。管理画面で古い答えを読むためだけに残す。 */
export const AGES_LEGACY: Choice[] = [
  { value: "pre", label: "年少より前" }, { value: "k1", label: "年少" }, { value: "k2", label: "年中" },
  { value: "k3", label: "年長" }, { value: "g1", label: "小1" }, { value: "g2", label: "小2以上" },
];
/** 2. この本を選んだ決め手（いくつでも・必須。「そのほか」を選ぶと自由記述を出す）。 */
export const REASONS: Choice[] = [
  { value: "steps", label: "6段階で少しずつ難しくなる" }, { value: "order", label: "「たす」から「うつす」へ進む順番" },
  { value: "pdf", label: "特典PDFでくり返し印刷できる" }, { value: "genre", label: "点図形（点描写）の問題集を探していた" },
  { value: "preview", label: "中身の見本を見て" }, { value: "value", label: "コスパがよかった（質問数が多く収録されていた）" },
  { value: "word", label: "人にすすめられて" }, { value: "other", label: "そのほか" },
];
export const REASON_OTHER = "other";
export const REASON_OTHER_MAX = 200;
/** 3.・4. 感想（よかったところ・改善点・必須）。 */
export const COMMENT_MAX = 1000;

export type SurveyAnswer = {
  age: string;
  reasons: string[];
  /** 決め手で「そのほか」を選んだときの自由記述。 */
  reasonOther?: string;
  /** 3. 使ってみての感想（よかったところ）。 */
  good: string;
  /** 4. 使ってみての感想（改善点）。 */
  improve: string;
  /** 5. 知り合いのご家庭にすすめたいか（0〜10）。 */
  recommend: number;
  /** どこから来たか（本の QR は utm_content=p97、受取ページの帯は band）。 */
  from?: string;
};

/** 設問を変える前（2026-10-27）に保存された答え。管理画面で読めるよう、あれば表示する。 */
export type LegacySurveyAnswer = { ages?: string[]; comment?: string };

const pick = (v: unknown, choices: Choice[]) => (typeof v === "string" && choices.some((c) => c.value === v) ? v : null);
const pickMany = (v: unknown, choices: Choice[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => pick(x, choices) !== null))] : [];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 受け口の検査。5問とも必須（決め手は1つ以上。「そのほか」の自由記述だけは空でもよい）。 */
export function parseSurvey(body: Record<string, unknown>): SurveyAnswer | string {
  const age = pick(body.age, AGES);
  if (!age) return "「1. 使ったお子さんの年齢」を選んでください。";
  const reasons = pickMany(body.reasons, REASONS);
  if (reasons.length === 0) return "「2. この本を選んだ決め手」を1つ以上選んでください。";
  const reasonOther = reasons.includes(REASON_OTHER) ? text(body.reasonOther, REASON_OTHER_MAX) : "";
  const good = text(body.good, COMMENT_MAX), improve = text(body.improve, COMMENT_MAX);
  if (!good) return "「3. 使ってみての感想（よかったところ）」を書いてください。";
  if (!improve) return "「4. 使ってみての感想（改善点）」を書いてください。";
  const recommend = typeof body.recommend === "number" && Number.isInteger(body.recommend) ? body.recommend : NaN;
  if (!(recommend >= 0 && recommend <= 10)) return "「5. すすめたいと思いますか」を0〜10から選んでください。";
  const from = typeof body.from === "string" && /^[a-z0-9-]{1,16}$/.test(body.from) ? body.from : undefined;
  return {
    age, reasons, ...(reasonOther ? { reasonOther } : {}), good, improve, recommend, ...(from ? { from } : {}),
  };
}

export const labelOf = (choices: Choice[], value: string) => choices.find((c) => c.value === value)?.label ?? value;
