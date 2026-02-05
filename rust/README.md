
---

## Rust ライブラリ (`ahc_vdsl.rs`) の使い方

`rust/src/ahc_vdsl.rs` を使うと、プロトコル仕様を意識せずに型安全にビジュアライザ出力を生成できます。

### セットアップ
1. `src/ahc_vdsl.rs` をコピーし、`main.rs`にペーストします。
2. `Cargo.toml` に以下を追加します:

```toml
[features]
vis = []
```

3. `main.rs` 上で`ahc_vdsl` moduleを用いてコードを書く

```rust
use crate::ahc_vdsl::*;
```

### Feature フラグ

- `vis` feature が有効な場合: 実際にビジュアライザ出力を生成します
- `vis` feature が無効な場合: 全ての関数呼び出しが無視され、出力には何も表示されなくなります。ただし、visualizerに渡すために生成したデータは消えないため注意してください

```bash
# ビジュアライザ出力あり
cargo run --features vis

# ビジュアライザ出力なし（本番用）
cargo run
```

### 基本的な使い方

#### 1. シンプルなグリッド表示

```rust
use crate::ahc_vdsl::*;

fn main() {
    let mut vis = VisRoot::new();

    // 10x10のグリッドを作成し、フレームに追加
    let grid = VisGrid::new(10, 10, None);
    let frame = VisFrame::new()
        .add_grid(grid)
        .set_score("12345".to_string());

    // フレームを追加
    vis.add_frame("default", frame);

    // 全てのフレームを出力
    vis.output_all();
}
```

#### 2. セルの色とテキストを設定

```rust
let grid = VisGrid::new(10, 10, None)
    // セルの色を変更 (x, y) = (3, 5) を赤に
    .update_cell_color((3, 5), RED)
    // セルにテキストを表示
    .update_text((0, 0), "A".to_string())
    .update_text((1, 0), "B".to_string());
```

#### 3. 複数フレームのアニメーション

```rust
let mut vis = VisRoot::new();

for step in 0..100 {
    // 現在位置をハイライト
    let pos = (step % 10, step / 10);
    let grid = VisGrid::new(10, 10, None)
        .update_cell_color(pos, BLUE);

    let textarea = VisTextArea::new(
        "StepInfo".to_string(),
        format!("Step: {}", step)
    )
    .height(150)
    .text_color("#1565c0".to_string())
    .fill_color("#e3f2fd".to_string());

    let frame = VisFrame::new()
        .add_grid(grid)
        .set_score((step * 100).to_string())
        .add_textarea(textarea);

    vis.add_frame("main", frame);
}

vis.output_all();
```

#### 4. 複数モードの使用

```rust
let mut vis = VisRoot::new();

// メインモード用のフレーム
let main_grid = VisGrid::new(20, 20, None);
let main_frame = VisFrame::new()
    .add_grid(main_grid)
    .set_score("1000".to_string());
vis.add_frame("main", main_frame);

// デバッグモード用のフレーム
let debug_grid = VisGrid::new(5, 5, None);
let debug_frame = VisFrame::new()
    .add_grid(debug_grid)
    .enable_debug();  // 生のコマンドを表示
vis.add_frame("debug", debug_frame);

vis.output_all();
```

#### 5. 2D平面描画

```rust
let plane = Vis2DPlane::new(100.0, 100.0, None)
    // 円を追加
    .add_circle(BLACK, RED, 50.0, 50.0, 10.0)
    // 線を追加
    .add_line(BLUE, 2.0, 0.0, 0.0, 100.0, 100.0)
    // 多角形を追加
    .add_polygon(GREEN, YELLOW, vec![
        (10.0, 10.0),
        (90.0, 10.0),
        (90.0, 90.0),
        (10.0, 90.0),
    ])
    // テキストを追加
    .add_text(BLACK, 12.0, 50.0, 50.0, "Center".to_string());

let frame = VisFrame::new()
    .add_2d_plane(plane)
    .set_score("5000".to_string());
```

#### 6. キャンバスに複数のアイテムを配置

```rust
// 左側にグリッドを配置
let grid1 = VisGrid::new(20, 20, Some(ItemBounds::new(0.0, 0.0, 800.0, 800.0)))
    .update_cell_color((5, 5), RED);

// 右側に別のグリッドを配置
let grid2 = VisGrid::new(10, 1, Some(ItemBounds::new(850.0, 0.0, 950.0, 800.0)));

let frame = VisFrame::new()
    // キャンバスサイズを設定 (高さ800, 幅1000)
    .set_canvas(VisCanvas::new(800.0, 1000.0))
    .add_grid(grid1)
    .add_grid(grid2)
    .set_score("12345".to_string());
```

#### 7. ファイルへの出力

```rust
// 標準エラー出力の代わりにファイルに出力
let mut vis = VisRoot::new_with_file("output.txt");

// ... フレームを追加 ...

vis.output_all();  // output.txt に書き込まれる
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

カスタム色は `Color::new(r, g, b)` で作成できます:

```rust
let custom_color = Color::new(128, 64, 255);
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
| `ItemBounds`  | キャンバス内でのアイテムの位置指定                           |
| `Color`       | RGB色                                                        |

#### VisTextArea

テキストエリアを作成し、カスタマイズします。Rustのラッパーでは高さと色はオプションですが、出力されるDSLフォーマットでは全てのパラメータが含まれます。

```rust
let textarea = VisTextArea::new(
    "Title".to_string(),      // タイトル（必須）
    "Content text".to_string() // 表示テキスト（必須）
)
.height(300)                                    // 高さ（オプション、デフォルト: 200）
.text_color("#ff0000".to_string())             // 文字色（オプション、デフォルト: #000000）
.fill_color("#ffff00".to_string());            // 背景色（オプション、デフォルト: #ffffff）

// 出力されるDSL: $v(MODE) TEXTAREA Title 300 #ff0000 #ffff00 Content text
