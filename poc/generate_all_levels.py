"""
TENZU PoC: 全レベルの点描写問題を生成（v3エンジン対応）
初級 → 上級 → 天才 → 神童 のそれぞれで代表的な問題を作る
"""

import sys
sys.path.insert(0, "C:/dev/TENZU/poc")

from tenbyousha_engine import VoxelShape, DotGridRenderer

OUT = "C:/dev/TENZU/poc/output"

import os
os.makedirs(OUT, exist_ok=True)


# =============================================================================
# 初級: 立方体の単純な組み合わせ（2〜4個）
# =============================================================================
def level_beginner():
    renderer = DotGridRenderer(grid_w=18, grid_h=14, dot_spacing=1.0)

    # 初級1: 立方体2個（横並び）
    s1 = VoxelShape()
    s1.add_box(0, 0, 0, 2, 1, 1)
    renderer.render_problem(s1, title="初級1 - 立方体2個",
                            save_path=f"{OUT}/beginner_01.png")

    # 初級2: 立方体3個（L字型、平面）
    s2 = VoxelShape()
    s2.add_box(0, 0, 0, 2, 1, 1)
    s2.add(0, 1, 0)
    renderer.render_problem(s2, title="初級2 - 立方体3個(L字)",
                            save_path=f"{OUT}/beginner_02.png")

    # 初級3: 立方体3個（横並び）
    s3 = VoxelShape()
    s3.add_box(0, 0, 0, 3, 1, 1)
    renderer.render_problem(s3, title="初級3 - 立方体3個(横一列)",
                            save_path=f"{OUT}/beginner_03.png")

    # 初級4: 立方体4個（2x2平面）
    s4 = VoxelShape()
    s4.add_box(0, 0, 0, 2, 2, 1)
    renderer.render_problem(s4, title="初級4 - 立方体4個(2x2)",
                            save_path=f"{OUT}/beginner_04.png")

    # 初級5: 立方体4個（階段型）
    s5 = VoxelShape()
    s5.add(0, 0, 0)
    s5.add(1, 0, 0)
    s5.add(1, 0, 1)
    s5.add(2, 0, 1)
    renderer.render_problem(s5, title="初級5 - 階段型",
                            save_path=f"{OUT}/beginner_05.png")

    print("初級: 5問生成完了")


# =============================================================================
# 上級: 直方体の切り欠き、L字型、より複雑な形状
# =============================================================================
def level_advanced():
    renderer = DotGridRenderer(grid_w=20, grid_h=16, dot_spacing=1.0)

    # 上級1: 2x2x2から1個切り欠き
    s1 = VoxelShape()
    s1.add_box(0, 0, 0, 2, 2, 2)
    s1.remove(0, 0, 1)
    renderer.render_problem(s1, title="上級1 - 直方体から切り欠き",
                            save_path=f"{OUT}/advanced_01.png")

    # 上級2: L字型立体（3x2x1からコーナー除去）
    s2 = VoxelShape()
    s2.add_box(0, 0, 0, 3, 2, 1)
    s2.remove(2, 1, 0)
    renderer.render_problem(s2, title="上級2 - L字型(平面)",
                            save_path=f"{OUT}/advanced_02.png")

    # 上級3: 3x2x2の直方体から角を除去
    s3 = VoxelShape()
    s3.add_box(0, 0, 0, 3, 2, 2)
    s3.remove_box(2, 0, 1, 1, 1, 1)
    renderer.render_problem(s3, title="上級3 - 直方体から角を除去",
                            save_path=f"{OUT}/advanced_03.png")

    # 上級4: T字型立体
    s4 = VoxelShape()
    s4.add_box(0, 0, 0, 3, 1, 1)
    s4.add_box(1, 0, 1, 1, 1, 1)
    renderer.render_problem(s4, title="上級4 - T字型",
                            save_path=f"{OUT}/advanced_04.png")

    # 上級5: 階段型3段
    s5 = VoxelShape()
    s5.add_box(0, 0, 0, 3, 1, 1)
    s5.add_box(0, 0, 1, 2, 1, 1)
    s5.add_box(0, 0, 2, 1, 1, 1)
    renderer.render_problem(s5, title="上級5 - 3段階段",
                            save_path=f"{OUT}/advanced_05.png")

    print("上級: 5問生成完了")


# =============================================================================
# 天才: 破線（隠線）付きの複雑形状
# =============================================================================
def level_genius():
    renderer = DotGridRenderer(grid_w=20, grid_h=16, dot_spacing=1.0)

    # 天才1: 2x2x2キューブ（隠線あり）
    s1 = VoxelShape()
    s1.add_box(0, 0, 0, 2, 2, 2)
    renderer.render_problem(s1, title="天才1 - 立方体(隠線あり)",
                            show_hidden=True,
                            save_path=f"{OUT}/genius_01.png")

    # 天才2: 3x2x2直方体 隠線あり
    s2 = VoxelShape()
    s2.add_box(0, 0, 0, 3, 2, 2)
    renderer.render_problem(s2, title="天才2 - 直方体3x2x2(隠線あり)",
                            show_hidden=True,
                            save_path=f"{OUT}/genius_02.png")

    # 天才3: 3x3x2から角を除去 + 隠線
    s3 = VoxelShape()
    s3.add_box(0, 0, 0, 3, 3, 2)
    s3.remove_box(0, 0, 0, 1, 1, 2)
    renderer.render_problem(s3, title="天才3 - 大型切り欠き(隠線あり)",
                            show_hidden=True,
                            save_path=f"{OUT}/genius_03.png")

    # 天才4: 十字型立体 + 隠線
    s4 = VoxelShape()
    s4.add_box(1, 0, 0, 1, 3, 1)
    s4.add_box(0, 1, 0, 3, 1, 1)
    s4.add_box(1, 1, 1, 1, 1, 1)
    renderer.render_problem(s4, title="天才4 - 十字型(隠線あり)",
                            show_hidden=True,
                            save_path=f"{OUT}/genius_04.png")

    # 天才5: 3x3x3から大きく切り欠き + 隠線
    s5 = VoxelShape()
    s5.add_box(0, 0, 0, 3, 3, 3)
    s5.remove_box(0, 0, 0, 2, 2, 2)
    renderer.render_problem(s5, title="天才5 - 大型切り欠き3x3x3(隠線あり)",
                            show_hidden=True,
                            save_path=f"{OUT}/genius_05.png")

    print("天才: 5問生成完了")


# =============================================================================
# 神童: 複雑積み上げ + 視点回転
# =============================================================================
def level_prodigy():
    renderer = DotGridRenderer(grid_w=22, grid_h=18, dot_spacing=1.0)

    # 神童1: 7個積み上げ（タワー型）
    s1 = VoxelShape()
    s1.add_box(0, 0, 0, 2, 2, 1)
    s1.add_box(0, 0, 1, 2, 1, 1)
    s1.add(0, 0, 2)
    renderer.render_problem(s1, title="神童1 - 7個積み上げ",
                            show_hidden=True,
                            save_path=f"{OUT}/prodigy_01.png")

    # 神童2: ピラミッド型（9+4+1=14個）
    s2 = VoxelShape()
    s2.add_box(0, 0, 0, 3, 3, 1)
    s2.add_box(0, 0, 1, 2, 2, 1)
    s2.add(0, 0, 2)
    renderer.render_problem(s2, title="神童2 - ピラミッド型",
                            show_hidden=True,
                            save_path=f"{OUT}/prodigy_02.png")

    # 神童3: 不規則な積み上げ
    s3 = VoxelShape()
    s3.add_box(0, 0, 0, 3, 2, 1)
    s3.add_box(0, 0, 1, 2, 2, 1)
    s3.add_box(0, 0, 2, 1, 2, 1)
    s3.add(0, 0, 3)
    renderer.render_problem(s3, title="神童3 - 不規則積み上げ(階段塔)",
                            show_hidden=True,
                            save_path=f"{OUT}/prodigy_03.png")

    # 神童4: 180°回転問題
    s4_orig = VoxelShape()
    s4_orig.add_box(0, 0, 0, 3, 2, 1)
    s4_orig.add_box(0, 0, 1, 2, 1, 1)
    s4_orig.add(0, 0, 2)

    s4_rotated = s4_orig.rotate_y_180()

    renderer_wide = DotGridRenderer(grid_w=22, grid_h=16, dot_spacing=1.0)
    renderer_wide.render_problem(s4_orig,
                                 title="神童4a - 元の形状",
                                 show_hidden=True,
                                 save_path=f"{OUT}/prodigy_04a_original.png")
    renderer_wide.render_problem(s4_rotated,
                                 title="神童4b - 180°回転後を描け",
                                 show_hidden=True,
                                 save_path=f"{OUT}/prodigy_04b_rotated.png")

    # 神童5: 大型不規則形状（隠線あり）
    s5 = VoxelShape()
    s5.add_box(0, 0, 0, 4, 3, 1)
    s5.remove_box(3, 0, 0, 1, 2, 1)
    s5.add_box(0, 0, 1, 3, 2, 1)
    s5.remove(2, 0, 1)
    s5.add_box(0, 0, 2, 2, 1, 1)
    s5.add(0, 0, 3)

    renderer_big = DotGridRenderer(grid_w=24, grid_h=20, dot_spacing=1.0)
    renderer_big.render_problem(s5, title="神童5 - 大型不規則形状",
                                show_hidden=True,
                                save_path=f"{OUT}/prodigy_05.png")

    print("神童: 5問生成完了")


# =============================================================================
# メイン
# =============================================================================
if __name__ == "__main__":
    print("=" * 50)
    print("TENZU PoC: 全レベル問題生成 (v3 Engine)")
    print("=" * 50)

    level_beginner()
    level_advanced()
    level_genius()
    level_prodigy()

    print("\n全レベル生成完了!")
    print(f"出力先: {OUT}/")
