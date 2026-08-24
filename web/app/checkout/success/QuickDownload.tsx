"use client";

/* ヒーロー直下のクイックDLストリップ。各巻の実体験ダウンロードボタン（下の設定内）を
   id 経由でクリックするだけ＝生成ロジックはそこに一本化されたまま重複させない。
   下で用紙・問題数などを変えて作り直せることを、ここで明示しておく。 */

export default function QuickDownload({
  items,
}: {
  items: { sku: string; title: string }[];
}) {
  if (items.length === 0) return null;

  const trigger = (sku: string) => {
    document.getElementById(`spv-download-${sku}`)?.click();
  };

  return (
    <div className="success-quickdl">
      <ul className="success-quickdl-list">
        {items.map(({ sku, title }) => (
          <li key={sku} className="success-quickdl-item">
            <span className="success-quickdl-name">{title}</span>
            <button type="button" className="success-quickdl-btn" onClick={() => trigger(sku)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" />
              </svg>
              PDF をダウンロード
            </button>
          </li>
        ))}
      </ul>
      <p className="success-quickdl-note">用紙・問題数・並びを変えたいときは、下の設定からいつでも作り直せます ↓</p>
    </div>
  );
}
