/* SNS 導線（サーバーコンポーネント・素の <a> のみ）
   - アカウント定義の SSOT は app/sns.ts。ここは「見せ方」だけを持つ。
   - 既定は ALL_SNS＝サイトに出す 4 つ（Pinterest を外した理由は app/sns.ts）。
     名義は TENZU（Instagram）と屋号 SUDO CRAFT（note・X・Ameba）に分かれるが、
     **分けて隠すのではなく 1 行の但し書きで説明する**（decisions §5.19）。
   - 外部リンクのクリックは GA4 の拡張計測（outbound click）が自動で拾う。
     自前イベントは足さない（analytics.md の Phase 1 = 3 イベント方針を崩さない）。 */

import { ALL_SNS, type SnsAccount } from "../sns";
import SnsIcon from "./SnsIcon";

/** 名義が 2 つに分かれる理由の但し書き。SSOT は sns-accounts.md §1.4。 */
export const SNS_NAMING_NOTE =
  "Instagram はお店（TENZU）、note・X・Ameba は店主の屋号（SUDO CRAFT）で発信しています。";

export default function SnsLinks({
  accounts = ALL_SNS,
  variant = "chips",
  heading,
  lede,
  showNamingNote = true,
  className = "",
}: {
  accounts?: SnsAccount[];
  /** chips = アイコン＋媒体名のピル（フッター常設）／rows = 一言つきの行（読ませたい面） */
  variant?: "chips" | "rows";
  heading?: string;
  lede?: string;
  showNamingNote?: boolean;
  className?: string;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className={`sns ${variant === "rows" ? "sns-block" : ""} ${className}`.trim()}>
      {heading ? <h5 className="sns-head">{heading}</h5> : null}
      {lede ? <p className="sns-lede">{lede}</p> : null}
      <ul className={variant === "rows" ? "sns-rows" : "sns-chips"}>
        {accounts.map((a) => (
          <li key={a.key}>
            <a
              href={a.url}
              target="_blank"
              /* noopener は target=_blank の必須対策。noreferrer は付けない
                 ＝こちらは発信側なので、リファラを落とす理由がない。 */
              rel="noopener"
              className={variant === "rows" ? "sns-row" : "sns-chip"}
            >
              <SnsIcon name={a.key} size={variant === "rows" ? 18 : 15} />
              <span className="sns-label">{a.label}</span>
              {variant === "rows" ? <span className="sns-blurb">{a.blurb}</span> : null}
            </a>
          </li>
        ))}
      </ul>
      {showNamingNote ? <p className="sns-note">{SNS_NAMING_NOTE}</p> : null}
    </div>
  );
}
