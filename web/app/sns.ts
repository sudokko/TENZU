/* =========================================================================
   SNS アカウント（コード側 SSOT）
   - 設計の SSOT は acquisition/sns-accounts.md。ここはその「実ハンドル」だけを持つ。
   - 名義は 2 層（sns-accounts.md §1.4 / decisions.md §5.16）:
       検索で見つかる面 = ブランド TENZU     … Pinterest・Instagram
       人で読まれる面   = 屋号 SUDO CRAFT   … note・X・Ameba
     **サイト上は 5 つまとめて出す**（2026-08-26 オーナー判断・decisions §5.19）。
     名義が割れていることは、隠すのではなく 1 行の但し書きで説明する
     （SnsLinks の SNS_NAMING_NOTE）。露出を削るより、5 つ全部に触れられる
     ほうが実利が大きいという判断。
   - ハンドルが名義内で揃っていないのは実取得の結果（媒体仕様・先行取得のため）。
     設計書の理想形ではなく、ここに書いてある実物が正。
   ========================================================================= */

export type SnsKey = "pinterest" | "instagram" | "note" | "x" | "ameba";
export type SnsOwner = "tenzu" | "sudocraft";

export interface SnsAccount {
  key: SnsKey;
  /** 媒体名（表示ラベル） */
  label: string;
  url: string;
  owner: SnsOwner;
  /** 「何が流れてくるか」の一言。リンクだけ並べても押す理由にならないため添える。 */
  blurb: string;
}

export const SNS: Record<SnsKey, SnsAccount> = {
  pinterest: {
    key: "pinterest",
    label: "Pinterest",
    url: "https://jp.pinterest.com/tenzuinfo/",
    owner: "tenzu",
    blurb: "問題プレビューのピン",
  },
  instagram: {
    key: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/tenzu.jp/",
    owner: "tenzu",
    blurb: "カルーセル中心に特徴を纏めて配信",
  },
  note: {
    key: "note",
    label: "note",
    url: "https://note.com/sudo_craft",
    owner: "sudocraft",
    blurb: "設計の裏側を解説",
  },
  x: {
    key: "x",
    label: "X",
    url: "https://x.com/sudocraft_jp",
    owner: "sudocraft",
    blurb: "店主のつぶやき",
  },
  ameba: {
    key: "ameba",
    label: "Ameba",
    url: "https://ameblo.jp/sudo-craft/",
    owner: "sudocraft",
    blurb: "店主のエッセイ（中学受験体験記など）",
  },
};

/* サイトに表示する 4 つ。**Pinterest は意図的に外している**（2026-08-26・decisions §5.19）:
   ① Pinterest の仕事は「Pinterest → サイト」の送客で、既にサイトへ来た人に見せるのは
      通ってきた道を指すだけ。ピンの中身は商品プレビュー＝サイトそのもので、
      フォローしても「ここにしかないもの」が無い
   ② Pinterest は検索・discovery 駆動でフォロワーが増えても配信が増えにくい＝
      こちら側の見返りも薄い（フィード型の Instagram とはここが違う）
   サイトから Pinterest を太らせたいなら、逆向きに「Pinterest に保存」ボタンを
   商品・記事の画像へ置くのが筋。**JSON-LD の sameAs には残す**（下記）＝
   検索エンジンへの主体申告は、人に見せるかとは別問題。 */
export const ALL_SNS: SnsAccount[] = [SNS.instagram, SNS.note, SNS.x, SNS.ameba];

/** ブランド名義 / 屋号名義（名義別に出したい場面用。既定は ALL_SNS） */
export const TENZU_SNS: SnsAccount[] = [SNS.pinterest, SNS.instagram];
export const SUDOCRAFT_SNS: SnsAccount[] = [SNS.note, SNS.x, SNS.ameba];

/* JSON-LD Organization の sameAs。名義は 2 層でも運営主体は 1 つなので、
   検索エンジンへは 5 つまとめて「同一主体」と申告する。**表示から外した Pinterest も
   ここには残す**＝エンティティの紐づけは、フッターに出すかどうかと無関係に効く。 */
export const SNS_SAME_AS: string[] = Object.values(SNS).map((a) => a.url);
