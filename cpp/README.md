# AHC VDSL - C++ Implementation

AtCoder Heuristic Contest用のVisualization Domain Specific Language（C++版）

## 特徴

- **Rustの実装と同等の機能**
- **AtCoderで使用可能**（標準ライブラリのみ使用）
- **Feature flagによるon/off切り替え**
- **ゼロコスト抽象化**（visualization無効時）

## 使い方

### 基本的な使用方法

1. `ahc_vdsl.hpp` をコピーして自分のプロジェクトに追加

2. コード内でインクルード:

```cpp
#define ENABLE_VIS  // visualization を有効にする場合
#include "ahc_vdsl.hpp"

using namespace ahc_vdsl;
```

### Visualization有効時

```cpp
#define ENABLE_VIS
#include "ahc_vdsl.hpp"

int main() {
    using namespace ahc_vdsl;
    
    // 標準エラー出力に出力
    VisRoot root;
    
    // またはファイルに出力
    // VisRoot root("output.txt");
    
    // グリッドを作成
    VisGrid grid(5, 5);
    grid.update_cell_color(2, 2, RED);
    
    // フレームを追加
    VisFrame frame = VisFrame::new_grid(grid, "12345");
    frame.add_textarea("Debug info");
    root.add_frame("main", frame);
    
    // 出力
    root.output_all();
    
    return 0;
}
```

### Visualization無効時（本番提出時）

```cpp
// #define ENABLE_VIS を削除またはコメントアウト
#include "ahc_vdsl.hpp"

int main() {
    using namespace ahc_vdsl;
    
    // 同じコードを書いても、すべてゼロコストで最適化される
    VisRoot root;
    VisGrid grid(5, 5);
    grid.update_cell_color(2, 2, RED);
    
    VisFrame frame = VisFrame::new_grid(grid, "12345");
    root.add_frame("main", frame);
    root.output_all();  // 何もしない
    
    return 0;
}
```

## コンパイル方法

### Visualization有効
```bash
g++ -std=c++17 -O2 -DENABLE_VIS main.cpp -o main
```

### Visualization無効（高速化）
```bash
g++ -std=c++17 -O2 main.cpp -o main
```

## API

### VisRoot
- `VisRoot()` - 標準エラー出力に出力
- `VisRoot(const std::string& filepath)` - ファイルに出力
- `void add_frame(const std::string& mode, const VisFrame& frame)`
- `void output_all()`

### VisCanvas
- `VisCanvas(double h = 800, double w = 800)` - キャンバスを作成
- `std::string to_vis_string(const std::string& mode)` - コマンド文字列を生成

### ItemBounds
- `ItemBounds(double left, double top, double right, double bottom)` - キャンバス内での位置を指定

### VisGrid
- `VisGrid(int h, int w)` - グリッドを作成
- `VisGrid(int h, int w, ItemBounds bounds)` - 位置を指定してグリッドを作成
- `void set_bounds(const ItemBounds& bounds)` - 位置を設定
- `void update_cell_color(int y, int x, Color color)`
- `void add_line(const std::vector<std::pair<int, int>>& line, Color color)`
- `void remove_wall_vertical(int y, int x)`
- `void remove_wall_horizontal(int y, int x)`
- `static VisGrid from_cells(const std::vector<std::vector<T>>& cells)`

### Vis2DPlane
- `Vis2DPlane(double h, double w)` - 2D平面を作成
- `Vis2DPlane(double h, double w, const ItemBounds& bounds)` - 位置を指定して2D平面を作成
- `void set_bounds(const ItemBounds& bounds)` - 位置を設定
- `void add_circle(Color stroke, Color fill, double x, double y, double r)`
- `void add_line(Color color, double ax, double ay, double bx, double by)`
- `void add_polygon(Color stroke, Color fill, const std::vector<std::pair<double, double>>& vertices)`

### VisFrame
- `static VisFrame new_grid(const VisGrid& grid, const std::string& score)`
- `static VisFrame new_2d_plane(const Vis2DPlane& plane, const std::string& score)`
- `void set_canvas(const VisCanvas& canvas)` - キャンバスを設定
- `void add_textarea(const std::string& text)`
- `void enable_debug()`

### 色定数
`WHITE`, `BLACK`, `GRAY`, `RED`, `BLUE`, `GREEN`, `YELLOW`, `CYAN`, `MAGENTA`

## テスト

```bash
make test
```

または

```bash
# Visualization有効時のテスト
g++ -std=c++17 -O2 ahc_vdsl_test.cpp -o test && ./test

# Visualization無効時のテスト
g++ -std=c++17 -O2 ahc_vdsl_test_disabled.cpp -o test_disabled && ./test_disabled
```

## ゼロコストについて

`ENABLE_VIS` が定義されていない場合、すべての関数は空の実装になり、コンパイラの最適化により実行時のオーバーヘッドは完全に0になります。

## Rust版との違い

- C++では空の構造体のサイズが1バイト（Rustは0バイト）ですが、最適化により実質的にゼロコストになります
- メモリ管理の違いにより、一部の実装（VisFrame）でポインタを使用しています

## ライセンス

MIT License
