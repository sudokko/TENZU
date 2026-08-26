"use client";

/* =========================================================================
   ピン素材書き出しツール本体（dev 限定・/atelier/pins）
   published 済み SKU を選ぶ → テンプレ P1/P2/P3 を選ぶ → 縦長ピンをプレビュー
   → PNG（個別・一括）と captions.csv を書き出す。
   素材は実問題（メーカー出力）。AI 画像は使わない。自動投稿もしない。
   ========================================================================= */
import { useMemo, useState } from "react";
import { PUBLISHED } from "../../products/problems/published";
import { volBySku } from "../../products/data";
import {
  PIN_W, PIN_H, PIN_CAMPAIGNS, pinP1, pinP2, pinP3, pinRow, buildCsv, buildP2Ladder,
  type PinTemplate, type PinRow,
} from "./pin-render";
import "./pins.css";

const TEMPLATES: { key: PinTemplate; label: string; note: string }[] = [
  { key: "p1", label: "P1 一問プレビュー", note: "発見用・1問につき1枚（みほん→うつす）" },
  { key: "p2", label: "P2 難度ちがい", note: "保存狙い・易→難の3問を1枚に" },
  { key: "p3", label: "P3 まとめ表紙", note: "第三者紹介/カルーセル表紙・6問サムネ" },
];

type Pin = { filename: string; svg: string; row: PinRow };

function dataUrl(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

async function svgToPngBlob(svg: string): Promise<Blob> {
  const url = dataUrl(svg);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("svg load failed"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = PIN_W;
  canvas.height = PIN_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PIN_W, PIN_H);
  ctx.drawImage(img, 0, 0, PIN_W, PIN_H);
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"),
  );
}

function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(u);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function PinsApp() {
  // 立体（solid）は Pinterest テンプレ（正方格子前提）非対応のため一覧から除外。
  const publishedSkus = useMemo(
    () => Object.keys(PUBLISHED).filter((s) => PUBLISHED[s].task !== "solid"),
    [],
  );
  const [sku, setSku] = useState(publishedSkus[0] ?? "");
  const [template, setTemplate] = useState<PinTemplate>("p1");
  // utm_campaign（施策・シーズン）。季節ピンは 2-3 ヶ月前出しで焼く（sns-operations.md §5）。
  const [campaign, setCampaign] = useState<string>(PIN_CAMPAIGNS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pins = useMemo<Pin[]>(() => {
    const set = PUBLISHED[sku];
    const hit = volBySku(sku);
    if (!set || !hit) return [];
    const { task, vol } = hit;
    const fname = (suffix: string) => `pin_${sku}_${template}${suffix}.png`;

    if (template === "p1") {
      return set.problems.map((p, i) => {
        const seq = i + 1;
        const filename = fname(`_${String(seq).padStart(2, "0")}`);
        return {
          filename,
          svg: pinP1(task, vol, p),
          row: pinRow("p1", task, vol, filename, { campaign, p, seq }),
        };
      });
    }
    if (template === "p2") {
      const filename = fname("");
      return [{
        filename,
        svg: pinP2(task, buildP2Ladder(sku)),
        row: pinRow("p2", task, vol, filename, { campaign }),
      }];
    }
    const filename = fname("");
    return [{
      filename,
      svg: pinP3(task, vol, set.problems),
      row: pinRow("p3", task, vol, filename, { campaign }),
    }];
  }, [sku, template, campaign]);

  async function exportOne(pin: Pin) {
    setBusy(true);
    try {
      downloadBlob(await svgToPngBlob(pin.svg), pin.filename);
    } finally {
      setBusy(false);
    }
  }

  async function exportAll() {
    setBusy(true);
    setMsg("");
    try {
      for (let i = 0; i < pins.length; i++) {
        setMsg(`書き出し中… ${i + 1}/${pins.length}`);
        downloadBlob(await svgToPngBlob(pins[i].svg), pins[i].filename);
        await sleep(350); // 連続ダウンロードのブロック回避
      }
      setMsg(`PNG ${pins.length} 枚を書き出しました`);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const csv = buildCsv(pins.map((p) => p.row));
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `captions_${sku}_${template}_${campaign}.csv`);
  }

  return (
    <main className="pin-wrap">
      <header className="pin-head">
        <h1>ピン素材書き出し <span className="pin-dev">dev</span></h1>
        <p>
          published 済みの問題から Pinterest 用の縦長ピン（{PIN_W}×{PIN_H}）を書き出す。
          素材は実問題（メーカー出力）。<a href="/atelier">← atelier に戻る</a>
        </p>
      </header>

      <section className="pin-controls">
        <label>
          SKU（公開済のみ）
          <select value={sku} onChange={(e) => setSku(e.target.value)}>
            {publishedSkus.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          施策・シーズン（utm_campaign）
          <select value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            {PIN_CAMPAIGNS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <div className="pin-templates" role="radiogroup" aria-label="テンプレート">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pin-tmpl ${template === t.key ? "is-on" : ""}`}
              aria-pressed={template === t.key}
              onClick={() => setTemplate(t.key)}
            >
              <strong>{t.label}</strong>
              <span>{t.note}</span>
            </button>
          ))}
        </div>

        <div className="pin-actions">
          <button type="button" className="pin-btn pin-btn--primary" disabled={busy || pins.length === 0} onClick={exportAll}>
            PNG を一括書き出し（{pins.length}枚）
          </button>
          <button type="button" className="pin-btn" disabled={busy || pins.length === 0} onClick={exportCsv}>
            captions.csv を書き出し
          </button>
          {msg && <span className="pin-msg">{msg}</span>}
        </div>
      </section>

      {publishedSkus.length === 0 && (
        <p className="pin-empty">published 済みの SKU がありません。/atelier で publish してください。</p>
      )}

      <section className="pin-grid">
        {pins.map((pin) => (
          <figure key={pin.filename} className="pin-card">
            <img className="pin-img" src={dataUrl(pin.svg)} alt={pin.filename} width={PIN_W} height={PIN_H} />
            <figcaption>
              <code>{pin.filename}</code>
              <button type="button" className="pin-btn pin-btn--sm" disabled={busy} onClick={() => exportOne(pin)}>
                PNG
              </button>
              <details>
                <summary>キャプション</summary>
                <pre className="pin-caption">{pin.row.caption}{"\n\n"}{pin.row.hashtags}</pre>
                <code className="pin-url">{pin.row.url}</code>
              </details>
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
