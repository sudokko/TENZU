"use client";

/* =========================================================================
   Vol 管理パネル（dev 限定・/atelier まとめ）
   任意の Lv・grid で Vol を追加／メタ編集（grid・説明文・対象年齢・variant・status）／
   削除・非表示。書き込みは /api/atelier/vol。既存ハードコード Vol は data.ts を触らず
   catalog-extra.json の上書きレイヤで反映する。変更後はページを再読込して反映を確実にする。
   ========================================================================= */

import { useState } from "react";
import { LEVEL_NAMES } from "../products/data";

export type MVol = {
  sku: string; lv: number; volNo: number; grid: string; variant?: string;
  blurb: string; ageLabel: string; status: string;
  hasGen: boolean; isPub: boolean; isExtra: boolean;
};
export type MTask = { slug: string; name: string; vols: MVol[] };

/* status（live/scaffold）はここでは編集しない。公開状態は「12 問を採用して公開する」＝
   published/{sku}.json の有無から導出される（products/data.ts）。店から下げるときは
   status を戻すのではなく「非表示」を使う。 */

export default function VolManager({
  tasks, launchHiddenTasks = [], hidden,
}: { tasks: MTask[]; launchHiddenTasks?: MTask[]; hidden: string[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);   // 編集中の sku
  const [creating, setCreating] = useState<string | null>(null); // 追加フォームを開いてるタスク slug

  async function call(payload: Record<string, unknown>, okMsg: string) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/atelier/vol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) { setMsg(j.error ?? "失敗しました"); setBusy(false); return false; }
      setMsg(okMsg);
      // data.ts の再読込が要るのでページごとリロード（dev ツール・確実性優先）
      window.location.reload();
      return true;
    } catch {
      setMsg("通信に失敗しました"); setBusy(false); return false;
    }
  }

  const renderTask = (task: MTask) => (
    <div key={task.slug} className="atl-vm-task">
      <div className="atl-vm-taskhead">
        <h3>{task.name} <span className="atl-slug">/{task.slug}</span></h3>
        <button type="button" className="atl-btn" disabled={busy}
          onClick={() => { setCreating(creating === task.slug ? null : task.slug); setEditing(null); }}>
          ＋ Vol を追加
        </button>
      </div>

      {creating === task.slug && (
        <CreateForm task={task} busy={busy}
          onCancel={() => setCreating(null)}
          onCreate={(payload) => call({ action: "create", task: task.slug, ...payload }, "Vol を追加しました")} />
      )}

      <div className="atl-vm-rows">
        {task.vols.map((v) => (
          <div key={v.sku} className="atl-vm-row">
            {editing === v.sku ? (
              <EditForm vol={v} busy={busy}
                onCancel={() => setEditing(null)}
                onSave={(patch) => call({ action: "update", sku: v.sku, patch }, "メタを更新しました")} />
            ) : (
              <>
                <div className="atl-vm-rowmain">
                  <span className="atl-vm-name">
                    Lv.{v.lv} {LEVEL_NAMES[v.lv - 1]} Vol.{v.volNo} · {v.grid}
                    {v.variant && <em className="atl-vm-variant">（{v.variant}）</em>}
                  </span>
                  <span className="atl-vm-sku">{v.sku}</span>
                  <span className="atl-vm-blurb">{v.blurb}</span>
                  <span className="atl-vm-badges">
                    {v.status === "live"
                      ? <em className="atl-badge atl-badge--pub">公開中</em>
                      : <em className="atl-badge">未公開（準備中）</em>}
                    {/* skus.ts は live と言っているのに問題データ本体が無い＝生成物が古いか
                        published/{sku}.json が未追跡。ビルドが壊れる前にここで気づく。 */}
                    {v.status === "live" && !v.isPub && (
                      <em className="atl-badge atl-badge--warn">⚠ 問題データ不在</em>
                    )}
                    {v.hasGen ? <em className="atl-badge atl-badge--gen">自動生成</em> : <em className="atl-badge">手設計</em>}
                    {v.isExtra && <em className="atl-badge">追加</em>}
                    {v.ageLabel && <em className="atl-badge">{v.ageLabel}</em>}
                  </span>
                </div>
                <div className="atl-vm-rowacts">
                  <a className="atl-vm-open" href={`/atelier/${v.sku}`}>開く</a>
                  <button type="button" disabled={busy} onClick={() => { setEditing(v.sku); setCreating(null); }}>編集</button>
                  <button type="button" disabled={busy} className="atl-vm-del"
                    onClick={() => {
                      const confirmMsg = v.isExtra
                        ? `追加した ${v.sku} を完全に削除しますか？（candidates は残ります）`
                        : `既存の ${v.sku} を非表示にしますか？（公開・一覧から消えます・後で復活可）`;
                      if (window.confirm(confirmMsg)) call({ action: "delete", sku: v.sku }, v.isExtra ? "削除しました" : "非表示にしました");
                    }}>
                    {v.isExtra ? "削除" : "非表示"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="atl-vm">
      <h2 className="atl-vm-title">Vol 管理</h2>
      <p className="atl-vm-note">
        任意の Lv・grid で Vol を追加／メタ編集／削除・非表示ができます。生成器のあるタスクは追加時に
        基準（ladder）も雛形から複製されます。既存巻の「削除」は非表示（hidden）、追加した巻は実削除です。
        公開状態はここでは切り替えません——各巻を開いて 12 問を採用し「公開する」を押した時点で
        商品ページが生えます（入稿済み＝公開）。店から下げるときは「非表示」を使ってください。
      </p>
      {msg && <p className="atl-vm-msg">{msg}</p>}

      {tasks.map(renderTask)}

      {launchHiddenTasks.length > 0 && (
        <div className="atl-vm-launchhidden">
          <h3 className="atl-vm-lh-title">ローンチ非公開（データ温存・再投入可）</h3>
          <p className="atl-vm-note">
            今回のローンチ公開から外したタスク（拡大・縮小）。データは保持しています。
            capabilities.ts の <code>LAUNCH_HIDDEN</code> から外せば公開に戻せます。
          </p>
          {launchHiddenTasks.map(renderTask)}
        </div>
      )}

      {hidden.length > 0 && (
        <div className="atl-vm-hidden">
          <h3>非表示中の既存 Vol</h3>
          <div className="atl-vm-rows">
            {hidden.map((sku) => (
              <div key={sku} className="atl-vm-row">
                <span className="atl-vm-sku">{sku}</span>
                <button type="button" className="atl-btn" disabled={busy}
                  onClick={() => call({ action: "restore", sku }, "復活しました")}>復活</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CreateForm({
  task, busy, onCancel, onCreate,
}: {
  task: MTask; busy: boolean; onCancel: () => void;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const [lv, setLv] = useState(task.vols[0]?.lv ?? 1);
  const [grid, setGrid] = useState(task.vols[0]?.grid ?? "3×3");
  const [variant, setVariant] = useState("");
  const [blurb, setBlurb] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [cloneFrom, setCloneFrom] = useState("");

  return (
    <form className="atl-vm-form" onSubmit={(e) => {
      e.preventDefault();
      onCreate({ lv, grid: grid.trim(), variant, blurb, ageLabel, cloneFrom: cloneFrom || undefined });
    }}>
      <div className="atl-vm-fgrid">
        <label>Lv
          <select value={lv} onChange={(e) => setLv(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Lv.{n} {LEVEL_NAMES[n - 1]}</option>)}
          </select>
        </label>
        <label>grid
          <input type="text" value={grid} placeholder="4×4 / ブロック 2〜5" onChange={(e) => setGrid(e.target.value)} />
        </label>
        <label>variant（任意）
          <input type="text" value={variant} placeholder="縦軸・欠け多め など" onChange={(e) => setVariant(e.target.value)} />
        </label>
        <label>対象年齢（任意）
          <input type="text" value={ageLabel} placeholder="5〜7才ごろ" onChange={(e) => setAgeLabel(e.target.value)} />
        </label>
        <label>基準の複製元（任意）
          <select value={cloneFrom} onChange={(e) => setCloneFrom(e.target.value)}>
            <option value="">同タスク先頭から</option>
            {task.vols.map((v) => <option key={v.sku} value={v.sku}>{v.sku}</option>)}
          </select>
        </label>
      </div>
      <label className="atl-vm-fwide">説明文（任意）
        <input type="text" value={blurb} placeholder="この巻のキャッチコピー" onChange={(e) => setBlurb(e.target.value)} />
      </label>
      <div className="atl-vm-formacts">
        <button type="submit" className="atl-btn atl-btn--pub" disabled={busy || !grid.trim()}>追加する</button>
        <button type="button" onClick={onCancel}>やめる</button>
      </div>
    </form>
  );
}

function EditForm({
  vol, busy, onCancel, onSave,
}: {
  vol: MVol; busy: boolean; onCancel: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [grid, setGrid] = useState(vol.grid);
  const [variant, setVariant] = useState(vol.variant ?? "");
  const [blurb, setBlurb] = useState(vol.blurb);
  const [ageLabel, setAgeLabel] = useState(vol.ageLabel);

  return (
    <form className="atl-vm-form" onSubmit={(e) => {
      e.preventDefault();
      onSave({ grid: grid.trim(), variant, blurb, ageLabel });
    }}>
      <p className="atl-vm-editsku">{vol.sku} を編集{vol.hasGen && <em>（生成 grid は「N×N」で ladder にも同期）</em>}</p>
      <div className="atl-vm-fgrid">
        <label>grid
          <input type="text" value={grid} onChange={(e) => setGrid(e.target.value)} />
        </label>
        <label>variant
          <input type="text" value={variant} onChange={(e) => setVariant(e.target.value)} />
        </label>
        <label>対象年齢
          <input type="text" value={ageLabel} onChange={(e) => setAgeLabel(e.target.value)} />
        </label>
        <label>公開状態（編集不可）
          <output className="atl-vm-ro">
            {vol.status === "live" ? "公開中（入稿済み）" : "未公開 — 12 問を採用して「公開する」"}
          </output>
        </label>
      </div>
      <label className="atl-vm-fwide">説明文
        <input type="text" value={blurb} onChange={(e) => setBlurb(e.target.value)} />
      </label>
      <div className="atl-vm-formacts">
        <button type="submit" className="atl-btn atl-btn--pub" disabled={busy}>保存する</button>
        <button type="button" onClick={onCancel}>やめる</button>
      </div>
    </form>
  );
}
