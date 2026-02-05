
---

## C++ ライブラリ (`ahc_vdsl.hpp`) の使い方

`cpp/ahc_vdsl.hpp` を使うと、プロトコル仕様を意識せずに型安全にビジュアライザ出力を生成できます。

### セットアップ

AtCoderでは1つのファイルに全コードを含める必要があるため、`ahc_vdsl.hpp` を直接 `#include` するのではなく、その内容を提出コードの末尾にコピーペーストします。

```cpp
using namespace ahc_vdsl;

int main() {
    // あなたのコード
}

// ahc_vdsl.hpp の全内容をここにコピーペースト
// ...
```

ローカルでビジュアライザ出力を確認したい場合は、コピーペースト内容の直前に `#define ENABLE_VIS` を追加してください。

### Feature フラグ

- `ENABLE_VIS` 未定義: ビジュアライザ出力を行いません。クラスは空のスタブに置き換えられますが、visualizerに渡すために生成したデータは消えないため注意してください
- `ENABLE_VIS` が定義されている場合: ビジュアライザ出力を生成します。ローカルテスト時に使用。

```bash
# ビジュアライザ出力なし（本番提出用、デフォルト）
g++ -std=c++23 -O2 main.cpp -o main

# ビジュアライザ出力あり（ローカルテスト用）
g++ -std=c++23 -O2 -DENABLE_VIS main.cpp -o main
```

### 基本的な使い方

#### 1. シンプルなグリッド表示

```cpp
using namespace ahc_vdsl;

int main() {
    VisRoot root;

    // 10x10のグリッドを作成し、フレームに追加
    VisGrid grid(10, 10);

    VisFrame frame;
    frame.add_grid(grid);
    frame.set_score("12345");

    root.add_frame("default", frame);

    // 全てのフレームを出力
    root.output_all();
}
```

#### 2. セルの色とテキストを設定

```cpp
VisGrid grid(10, 10);
// セルの色を変更 (x, y) = (3, 5) を赤に
grid.update_cell_color(3, 5, RED);
// セルにテキストを表示
grid.update_text(0, 0, "A");
grid.update_text(1, 0, "B");
```

#### 3. 複数フレームのアニメーション

```cpp
VisRoot root;

for (int step = 0; step < 100; step++) {
    // 現在位置をハイライト
    int px = step % 10, py = step / 10;
    VisGrid grid(10, 10);
    grid.update_cell_color(px, py, BLUE);

    VisTextArea textarea("StepInfo", "Step: " + std::to_string(step));
    textarea.set_height(150)
            .set_text_color("#1565c0")
            .set_fill_color("#e3f2fd");

    VisFrame frame;
    frame.add_grid(grid);
    frame.set_score(std::to_string(step * 100));
    frame.add_textarea(textarea);

    root.add_frame("main", frame);
}

root.output_all();
```

#### 4. 複数モードの使用

```cpp
VisRoot root;

// メインモード用のフレーム
VisGrid main_grid(20, 20);
VisFrame main_frame;
main_frame.add_grid(main_grid);
main_frame.set_score("1000");
root.add_frame("main", main_frame);

// デバッグモード用のフレーム
VisGrid debug_grid(5, 5);
VisFrame debug_frame;
debug_frame.add_grid(debug_grid);
debug_frame.enable_debug();  // 生のコマンドを表示
root.add_frame("debug", debug_frame);

root.output_all();
```

#### 5. 2D平面描画

```cpp
Vis2DPlane plane(100.0, 100.0);
// 円を追加
plane.add_circle(BLACK, RED, 50.0, 50.0, 10.0);
// 線を追加
plane.add_line(BLUE, 2.0, 0.0, 0.0, 100.0, 100.0);
// 多角形を追加
plane.add_polygon(GREEN, YELLOW, {
    {10.0, 10.0}, {90.0, 10.0}, {90.0, 90.0}, {10.0, 90.0}
});

VisFrame frame;
frame.add_2d_plane(plane);
frame.set_score("5000");
```

#### 6. キャンバスに複数のアイテムを配置

```cpp
// 左側にグリッドを配置
VisGrid grid1(20, 20, ItemBounds(0.0, 0.0, 800.0, 800.0));
grid1.update_cell_color(5, 5, RED);

// 右側に別のグリッドを配置
VisGrid grid2(10, 1, ItemBounds(850.0, 0.0, 950.0, 800.0));

VisFrame frame;
// キャンバスサイズを設定 (高さ800, 幅1000)
frame.set_canvas(VisCanvas(800.0, 1000.0));
frame.add_grid(grid1);
frame.add_grid(grid2);
frame.set_score("12345");
```

#### 7. ファイルへの出力

```cpp
// 標準エラー出力の代わりにファイルに出力
VisRoot root("output.txt");

// ... フレームを追加 ...

root.output_all();  // output.txt に書き込まれる
```

#### 8. バーグラフの表示

```cpp
VisBarGraph bar_graph(BLUE, 0.0, 100.0);
bar_graph.add_item("Speed", 85.5)
         .add_item("Accuracy", 92.0)
         .add_item("Coverage", 78.3);

VisFrame frame;
frame.add_bar_graph(bar_graph);
frame.set_score("12345");
```

### 定義済みの色

以下の色が定数として定義されています:

| 定数      | 色                 |
| --------- | ------------------ |
| `WHITE`   | 白 (#FFFFFF)       |
| `BLACK`   | 黒 (#000000)       |
| `GRAY`    | 灰 (#808080)       |
| `RED`     | 赤 (#FF0000)       |
| `GREEN`   | 緑 (#00FF00)       |
| `BLUE`    | 青 (#0000FF)       |
| `YELLOW`  | 黄 (#FFFF00)       |
| `CYAN`    | シアン (#00FFFF)   |
| `MAGENTA` | マゼンタ (#FF00FF) |

カスタム色は `Color(r, g, b)` で作成できます:

```cpp
Color custom_color(128, 64, 255);
```

文字列からの生成も可能です:

```cpp
Color from_hex = Color::from_string("#FF8800");
```

### 主要な構造体

| 構造体        | 説明                                                         |
| ------------- | ------------------------------------------------------------ |
| `VisRoot`     | 全てのフレームを管理するルートオブジェクト                   |
| `VisFrame`    | 1つのフレーム（COMMITで区切られる単位）                      |
| `VisCanvas`   | キャンバスのサイズ設定                                       |
| `VisGrid`     | グリッド（盤面）の描画                                       |
| `Vis2DPlane`  | 2次元平面上の図形描画                                        |
| `VisTextArea` | テキストエリアの表示（タイトル、高さ、色のカスタマイズ可能） |
| `VisBarGraph` | バーグラフの表示                                             |
| `ItemBounds`  | キャンバス内でのアイテムの位置指定                           |
| `Color`       | RGB色                                                        |

#### VisTextArea

テキストエリアを作成し、カスタマイズします。高さと色はオプションで、デフォルト値が設定されます。

```cpp
VisTextArea textarea("Title", "Content text");
textarea.set_height(300)                     // 高さ（オプション、デフォルト: 200）
        .set_text_color("#ff0000")           // 文字色（オプション、デフォルト: #000000）
        .set_fill_color("#ffff00");          // 背景色（オプション、デフォルト: #ffffff）

// 出力されるDSL: $v(MODE) TEXTAREA Title 300 #ff0000 #ffff00 Content text
```

#### VisBarGraph

バーグラフを作成し、データを追加します。

```cpp
VisBarGraph bar_graph(BLUE, 0.0, 100.0);  // 色、Y軸最小値、Y軸最大値

// 個別に追加（method chaining 対応）
bar_graph.add_item("Label1", 50.0)
         .add_item("Label2", 75.0);

// 出力されるDSL:
// $v(MODE) BAR_GRAPH #0000FF 0 100
// 2 Label1 50 Label2 75

// まとめて追加する場合は add_items を使用（こちらも chaining 対応）
std::vector<BarGraphItem> items = {
    BarGraphItem("A", 30.0),
    BarGraphItem("B", 60.0),
};
bar_graph.add_items(items);
```

### テスト

```bash
make test
```

または個別に実行:

```bash
# Visualization有効時のテスト
g++ -std=c++23 -O2 -o ahc_vdsl_test ahc_vdsl_test.cpp && ./ahc_vdsl_test

# Visualization無効時のテスト
g++ -std=c++23 -O2 -o ahc_vdsl_test_disabled ahc_vdsl_test_disabled.cpp && ./ahc_vdsl_test_disabled
```

### ゼロコストについて

`ENABLE_VIS` が定義されていない場合、すべてのクラスが空のスタブに置き換えられ、関数呼び出し自体はゼロコストとなります。ただし、引数として渡される式の評価は関数呼び出しの前に行われるため残ります。例えば `add_line` に渡す座標リストの生成や `from_cells` に渡す行列の計算などは、`ENABLE_VIS` の有無に関係なく実行されます。
