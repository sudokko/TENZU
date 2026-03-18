"""
TENZU PoC: 点描写問題生成エンジン v3
ボクセルベースの3D形状 → 面ベースレンダリング（Painter's Algorithm）

投影方式: 全頂点が整数グリッド上に乗る疑似等角投影
  x軸(右手前) → (+2, -1) グリッド単位
  y軸(左手前) → (-2, -1) グリッド単位
  z軸(上)     → ( 0, +2) グリッド単位
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Polygon
from matplotlib.collections import LineCollection, PatchCollection
from collections import defaultdict
from itertools import product as iproduct
import platform

# =============================================================================
# 日本語フォント設定
# =============================================================================
def _setup_japanese_font():
    """OS に応じて日本語フォントを設定"""
    system = platform.system()
    candidates = []
    if system == 'Windows':
        candidates = ['Yu Gothic', 'Meiryo', 'MS Gothic']
    elif system == 'Darwin':
        candidates = ['Hiragino Sans', 'Hiragino Kaku Gothic Pro']
    else:
        candidates = ['Noto Sans CJK JP', 'IPAGothic', 'TakaoPGothic']

    from matplotlib.font_manager import FontManager
    fm = FontManager()
    available = {f.name for f in fm.ttflist}

    for name in candidates:
        if name in available:
            matplotlib.rcParams['font.family'] = name
            return name

    # フォールバック: sans-serif に候補を追加
    matplotlib.rcParams['font.family'] = 'sans-serif'
    matplotlib.rcParams['font.sans-serif'] = candidates + matplotlib.rcParams.get('font.sans-serif', [])
    return candidates[0] if candidates else 'sans-serif'

_setup_japanese_font()


# =============================================================================
# グリッドスナップ等角投影
# =============================================================================
ISO_MATRIX = np.array([
    [ 2, -2, 0],
    [-1, -1, 2],
], dtype=float)


def project_iso(point_3d):
    """3D座標 → 2Dグリッド座標（整数に乗る）"""
    p = np.array(point_3d, dtype=float)
    return ISO_MATRIX @ p


# =============================================================================
# ボクセル形状定義
# =============================================================================
class VoxelShape:
    """単位立方体の集合で3D形状を表現"""

    def __init__(self, voxels=None):
        self.voxels = set(voxels) if voxels else set()

    def add(self, x, y, z):
        self.voxels.add((x, y, z))
        return self

    def remove(self, x, y, z):
        self.voxels.discard((x, y, z))
        return self

    def add_box(self, x0, y0, z0, dx, dy, dz):
        """直方体ブロックを追加"""
        for x, y, z in iproduct(range(x0, x0+dx), range(y0, y0+dy), range(z0, z0+dz)):
            self.voxels.add((x, y, z))
        return self

    def remove_box(self, x0, y0, z0, dx, dy, dz):
        """直方体ブロックを除去（切り欠き）"""
        for x, y, z in iproduct(range(x0, x0+dx), range(y0, y0+dy), range(z0, z0+dz)):
            self.voxels.discard((x, y, z))
        return self

    def rotate_y_180(self):
        """Y軸周りに180°回転"""
        if not self.voxels:
            return VoxelShape()
        rotated = set()
        for x, y, z in self.voxels:
            rotated.add((-x, y, -z))
        min_x = min(v[0] for v in rotated)
        min_y = min(v[1] for v in rotated)
        min_z = min(v[2] for v in rotated)
        normalized = set((x - min_x, y - min_y, z - min_z) for x, y, z in rotated)
        return VoxelShape(normalized)

    def get_visible_faces(self):
        """
        可視面を Painter's Algorithm 用にソートして返す。

        各面は以下を持つ:
          - name: 'top', 'front', 'right', 'back', 'left', 'bottom'
          - vertices_2d: 2D投影後の4頂点
          - depth: ソート用の奥行き値
          - is_visible: バックフェースカリング結果
        """
        face_defs = {
            'top':    ((0,0,1),  [(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),
            'bottom': ((0,0,-1), [(0,0,0),(0,1,0),(1,1,0),(1,0,0)]),
            'front':  ((0,-1,0), [(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
            'back':   ((0,1,0),  [(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),
            'right':  ((1,0,0),  [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
            'left':   ((-1,0,0), [(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
        }

        # 視線ベクトル（カメラ方向）
        view_dir = np.array([1, 1, 1], dtype=float)
        view_dir = view_dir / np.linalg.norm(view_dir)

        faces = []
        for (vx, vy, vz) in self.voxels:
            for face_name, (normal, offsets) in face_defs.items():
                nx, ny, nz = normal
                neighbor = (vx + nx, vy + ny, vz + nz)
                if neighbor in self.voxels:
                    continue  # 内部面 → スキップ

                normal_vec = np.array(normal, dtype=float)
                dot = np.dot(normal_vec, view_dir)
                is_visible = dot > 0

                vertices_3d = [(vx+ox, vy+oy, vz+oz) for ox, oy, oz in offsets]
                vertices_2d = [project_iso(v) for v in vertices_3d]

                # 深度: 面の中心の (x + y - z) → 大きいほど奥
                cx = vx + nx * 0.5 + 0.5
                cy = vy + ny * 0.5 + 0.5
                cz = vz + nz * 0.5 + 0.5
                depth = cx + cy - cz

                faces.append({
                    'name': face_name,
                    'normal': normal,
                    'is_visible': is_visible,
                    'vertices_2d': vertices_2d,
                    'vertices_3d': vertices_3d,
                    'depth': depth,
                    'voxel': (vx, vy, vz),
                })

        # Painter's Algorithm: 奥から手前へ（depth大→小）
        faces.sort(key=lambda f: f['depth'], reverse=True)
        return faces

    def get_outline_edges(self):
        """
        可視面のアウトラインエッジのみ抽出。
        可視面の辺のうち、1つの可視面にしか属さない辺 = 輪郭線。
        """
        view_dir = np.array([1, 1, 1], dtype=float)
        view_dir = view_dir / np.linalg.norm(view_dir)

        face_defs = {
            'top':    ((0,0,1),  [(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),
            'bottom': ((0,0,-1), [(0,0,0),(0,1,0),(1,1,0),(1,0,0)]),
            'front':  ((0,-1,0), [(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
            'back':   ((0,1,0),  [(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),
            'right':  ((1,0,0),  [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
            'left':   ((-1,0,0), [(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
        }

        # 可視面の全辺を集める
        edge_count = defaultdict(int)
        all_visible_edges = []

        for (vx, vy, vz) in self.voxels:
            for face_name, (normal, offsets) in face_defs.items():
                nx, ny, nz = normal
                neighbor = (vx + nx, vy + ny, vz + nz)
                if neighbor in self.voxels:
                    continue

                normal_vec = np.array(normal, dtype=float)
                if np.dot(normal_vec, view_dir) <= 0:
                    continue  # バックフェース

                vertices_3d = [(vx+ox, vy+oy, vz+oz) for ox, oy, oz in offsets]
                for j in range(4):
                    edge = tuple(sorted([vertices_3d[j], vertices_3d[(j+1) % 4]]))
                    edge_count[edge] += 1

        # 辺が1面にしか属さない = 輪郭線
        # 辺が2面に属す = 内部辺（同じ向きの隣接面の境界）→ 描画しない
        # ただし、異なる面タイプの境界は描画する
        return [edge for edge, count in edge_count.items()]

    def get_hidden_edges(self):
        """
        隠線を取得: バックフェースの辺のうち、
        可視面の辺でないもの。
        """
        view_dir = np.array([1, 1, 1], dtype=float)
        view_dir = view_dir / np.linalg.norm(view_dir)

        face_defs = {
            'top':    ((0,0,1),  [(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),
            'bottom': ((0,0,-1), [(0,0,0),(0,1,0),(1,1,0),(1,0,0)]),
            'front':  ((0,-1,0), [(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
            'back':   ((0,1,0),  [(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),
            'right':  ((1,0,0),  [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
            'left':   ((-1,0,0), [(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
        }

        visible_edges = set()
        hidden_edge_candidates = defaultdict(int)

        for (vx, vy, vz) in self.voxels:
            for face_name, (normal, offsets) in face_defs.items():
                nx, ny, nz = normal
                neighbor = (vx + nx, vy + ny, vz + nz)
                if neighbor in self.voxels:
                    continue

                normal_vec = np.array(normal, dtype=float)
                is_front = np.dot(normal_vec, view_dir) > 0
                vertices_3d = [(vx+ox, vy+oy, vz+oz) for ox, oy, oz in offsets]

                for j in range(4):
                    edge = tuple(sorted([vertices_3d[j], vertices_3d[(j+1) % 4]]))
                    if is_front:
                        visible_edges.add(edge)
                    else:
                        hidden_edge_candidates[edge] += 1

        # 隠線 = バックフェース辺 かつ 可視辺でないもの
        return [e for e in hidden_edge_candidates if e not in visible_edges]


# =============================================================================
# 面の色定義
# =============================================================================
FACE_COLORS = {
    'top':    '#FFFFFF',   # 白（最も明るい）
    'front':  '#D0D0D0',   # 薄いグレー
    'left':   '#D0D0D0',   # 薄いグレー
    'right':  '#A0A0A0',   # 中間グレー
    'back':   '#A0A0A0',   # 中間グレー
    'bottom': '#808080',   # 暗いグレー
}


# =============================================================================
# レンダラー
# =============================================================================
class DotGridRenderer:
    """等角投影した図形を点グリッド上にレンダリング（面ベース）"""

    def __init__(self, grid_w=20, grid_h=20, dot_spacing=1.0, figsize=(8, 8)):
        self.grid_w = grid_w
        self.grid_h = grid_h
        self.dot_spacing = dot_spacing
        self.figsize = figsize

    def _calc_auto_offset(self, shape):
        """形状の2D投影範囲を計算し、グリッド中央に配置するオフセットを返す"""
        if not shape.voxels:
            return (self.grid_w // 2, self.grid_h // 2)

        # 全ボクセルの全頂点を投影して範囲を求める
        all_2d = []
        for (vx, vy, vz) in shape.voxels:
            for dx, dy, dz in iproduct(range(2), range(2), range(2)):
                pt = project_iso((vx + dx, vy + dy, vz + dz))
                all_2d.append(pt)

        all_2d = np.array(all_2d)
        min_x, min_y = all_2d.min(axis=0)
        max_x, max_y = all_2d.max(axis=0)

        shape_cx = (min_x + max_x) / 2
        shape_cy = (min_y + max_y) / 2

        grid_cx = (self.grid_w - 1) / 2
        grid_cy = (self.grid_h - 1) / 2

        ox = grid_cx - shape_cx
        oy = grid_cy - shape_cy

        return (ox, oy)

    def _draw_dots(self, ax):
        """点グリッドを描画"""
        xs, ys = [], []
        for gx in range(self.grid_w):
            for gy in range(self.grid_h):
                xs.append(gx * self.dot_spacing)
                ys.append(gy * self.dot_spacing)
        ax.scatter(xs, ys, s=3, c='#BBBBBB', zorder=0, edgecolors='none')

    def _draw_border(self, ax):
        """枠線"""
        s = self.dot_spacing
        margin = s * 0.5
        w = (self.grid_w - 1) * s + margin * 2
        h = (self.grid_h - 1) * s + margin * 2
        rect = plt.Rectangle((-margin, -margin), w, h,
                              fill=False, edgecolor='#999999', linewidth=1.5)
        ax.add_patch(rect)

    def _set_axes(self, ax):
        """共通のaxes設定"""
        s = self.dot_spacing
        margin = s * 1.5
        ax.set_xlim(-margin, (self.grid_w - 1) * s + margin)
        ax.set_ylim(-margin, (self.grid_h - 1) * s + margin)
        ax.set_aspect('equal')
        ax.axis('off')

    def _classify_edges(self, shape):
        """
        辺を分類: outline（輪郭）, fold（折れ線）, internal（同一面内グリッド）
        - outline: 可視面1つにしか属さない辺 → 太線
        - fold: 異なる向きの可視面2つに属す辺 → 中線
        - internal: 同じ向きの可視面2つに属す辺 → 細線
        """
        view_dir = np.array([1, 1, 1], dtype=float)
        view_dir = view_dir / np.linalg.norm(view_dir)

        face_defs = {
            'top':    ((0,0,1),  [(0,0,1),(1,0,1),(1,1,1),(0,1,1)]),
            'bottom': ((0,0,-1), [(0,0,0),(0,1,0),(1,1,0),(1,0,0)]),
            'front':  ((0,-1,0), [(0,0,0),(1,0,0),(1,0,1),(0,0,1)]),
            'back':   ((0,1,0),  [(0,1,0),(0,1,1),(1,1,1),(1,1,0)]),
            'right':  ((1,0,0),  [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]),
            'left':   ((-1,0,0), [(0,0,0),(0,0,1),(0,1,1),(0,1,0)]),
        }

        edge_face_names = defaultdict(list)

        for (vx, vy, vz) in shape.voxels:
            for face_name, (normal, offsets) in face_defs.items():
                nx, ny, nz = normal
                neighbor = (vx + nx, vy + ny, vz + nz)
                if neighbor in shape.voxels:
                    continue
                normal_vec = np.array(normal, dtype=float)
                if np.dot(normal_vec, view_dir) <= 0:
                    continue

                vertices_3d = [(vx+ox, vy+oy, vz+oz) for ox, oy, oz in offsets]
                for j in range(4):
                    edge = tuple(sorted([vertices_3d[j], vertices_3d[(j+1) % 4]]))
                    edge_face_names[edge].append(face_name)

        outline, fold, internal = [], [], []
        for edge, names in edge_face_names.items():
            if len(names) == 1:
                outline.append(edge)
            elif len(set(names)) == 1:
                internal.append(edge)
            else:
                fold.append(edge)

        return outline, fold, internal

    def render(self, shape, title="", show_hidden=False, show_dots=True,
               offset=None, save_path=None, ax=None):
        """形状をレンダリング（面ベース + Painter's Algorithm + 辺分類）"""
        own_fig = ax is None
        if own_fig:
            fig, ax = plt.subplots(1, 1, figsize=self.figsize)

        if show_dots:
            self._draw_dots(ax)

        if offset is None:
            offset = self._calc_auto_offset(shape)
        ox, oy = offset
        s = self.dot_spacing

        def to_screen(pt_2d):
            return (pt_2d[0] * s + ox * s, pt_2d[1] * s + oy * s)

        # Step 1: 面を塗る（辺なし、Painter's Algorithm）
        faces = shape.get_visible_faces()
        for face in faces:
            if not face['is_visible']:
                continue
            verts_screen = [to_screen(v) for v in face['vertices_2d']]
            color = FACE_COLORS.get(face['name'], '#E0E0E0')
            poly = Polygon(verts_screen, closed=True,
                           facecolor=color, edgecolor='none',
                           linewidth=0, zorder=10)
            ax.add_patch(poly)

        # Step 2: 隠線（破線）— 面の下に描画し、面で自然に遮蔽
        if show_hidden:
            hidden_edges = shape.get_hidden_edges()
            hid_lines = []
            for (p1, p2) in hidden_edges:
                xy1 = to_screen(project_iso(p1))
                xy2 = to_screen(project_iso(p2))
                hid_lines.append([xy1, xy2])
            if hid_lines:
                lc_h = LineCollection(hid_lines, colors='#666666', linewidths=0.8,
                                      linestyles=(0, (4, 3)), zorder=5)
                ax.add_collection(lc_h)

        # Step 3: 辺を分類して描画
        outline, fold, internal = self._classify_edges(shape)

        def make_lines(edges):
            return [[to_screen(project_iso(p1)), to_screen(project_iso(p2))]
                    for (p1, p2) in edges]

        # 内部辺（同一面のキューブ境界）→ 細い薄グレー
        int_lines = make_lines(internal)
        if int_lines:
            lc_int = LineCollection(int_lines, colors='#AAAAAA', linewidths=0.5, zorder=20)
            ax.add_collection(lc_int)

        # 折れ線（面の向きが変わる境界）→ 中太
        fold_lines = make_lines(fold)
        if fold_lines:
            lc_fold = LineCollection(fold_lines, colors='black', linewidths=1.2, zorder=21)
            ax.add_collection(lc_fold)

        # 輪郭線 → 太い黒
        out_lines = make_lines(outline)
        if out_lines:
            lc_out = LineCollection(out_lines, colors='black', linewidths=2.0, zorder=22)
            ax.add_collection(lc_out)

        self._set_axes(ax)

        if title:
            ax.set_title(title, fontsize=13, fontweight='bold', pad=10)

        if own_fig:
            plt.tight_layout()
            if save_path:
                plt.savefig(save_path, dpi=150, bbox_inches='tight',
                            facecolor='white')
                print(f"Saved: {save_path}")
            plt.close()
            return save_path
        return ax

    def render_problem(self, shape, title="", show_hidden=False,
                       offset=None, save_path=None):
        """問題形式: 左に見本、右に解答用グリッド"""
        fig, (ax_l, ax_r) = plt.subplots(1, 2, figsize=(16, 8))

        # 左: 見本
        self.render(shape, title=f"【見本】{title}", show_hidden=show_hidden,
                    show_dots=True, offset=offset, ax=ax_l)
        self._draw_border(ax_l)

        # 右: 解答欄
        self._draw_dots(ax_r)
        self._draw_border(ax_r)
        self._set_axes(ax_r)
        ax_r.set_title("【解答欄】", fontsize=13, fontweight='bold', pad=10)

        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight',
                        facecolor='white')
            print(f"Saved: {save_path}")
        plt.close()
        return save_path


# =============================================================================
# テスト
# =============================================================================
if __name__ == "__main__":
    # 立方体1個テスト
    shape = VoxelShape()
    shape.add_box(0, 0, 0, 1, 1, 1)
    renderer = DotGridRenderer(grid_w=16, grid_h=12, dot_spacing=1.0)
    renderer.render(shape, title="単体キューブ",
                    save_path="C:/dev/TENZU/poc/test_v3_cube.png")

    # L字型（隠線あり）
    shape2 = VoxelShape()
    shape2.add_box(0, 0, 0, 2, 2, 2)
    shape2.remove(0, 0, 1)
    renderer2 = DotGridRenderer(grid_w=18, grid_h=14, dot_spacing=1.0)
    renderer2.render(shape2, title="L字切り欠き（隠線あり）",
                     show_hidden=True,
                     save_path="C:/dev/TENZU/poc/test_v3_hidden.png")

    print("Engine v3 test complete.")
