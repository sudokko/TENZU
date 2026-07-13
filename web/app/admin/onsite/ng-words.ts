/* NG 語彙チェック（管理画面の警告用・保存はブロックしない）。
   SSOT は foundation/voice-tone.md — §1「NG 語彙の grep 対象」＋ §7.6（広告・LP 追加分）。
   SSOT 側の grep パターンを更新したら、この配列も同期すること。 */

const NG_PATTERNS: RegExp[] = [
  // voice-tone.md §1
  /処方箋|特効薬|治療|弱点診断|健康診断|自己診断|穴を埋め|ピンポイント治療|手遅れ|もう間に合わない|差がつく|猛特訓|克服|叩き込む|点つなぎを卒業|点つなぎでは物足りない|やれば算数が伸びる|漢字書字の特効薬|つまずかないために|苦手にならないために|取りこぼさないために|やっておかないと|後悔する|TENZU は空間認識|空間認識能力 低い|空間認識能力 病気/g,
  // voice-tone.md §7.6（広告コピー・LP 追加分）
  /アプリで作る|アプリをDL|アプリをダウンロード|アプリをインストール|集中力が伸びる|発達に効果|頭が良くなる|IQが上がる|今すぐ始めないと|小1の壁|集中力アップ|学力が上がる/g,
];

/* text に含まれる NG 語をユニークに列挙する（無ければ空配列） */
export function checkNgWords(text: string): string[] {
  const hits = new Set<string>();
  for (const re of NG_PATTERNS) {
    for (const m of text.matchAll(re)) hits.add(m[0]);
  }
  return [...hits];
}
