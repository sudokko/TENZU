"use client";
/* 取得日の切り替え（?at=YYYY-MM-DD）。ページ全体の数字がこの 1 つで切り替わる。 */
import { useRouter } from "next/navigation";

export default function SnapshotPicker({ dates, current }: { dates: string[]; current: string }) {
  const router = useRouter();
  return (
    <label className="snsd-picker">
      <span>取得日</span>
      <select value={current} onChange={(e) => router.push(`/atelier/sns?at=${e.target.value}`)}>
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
