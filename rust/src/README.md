
---

## Rust ライブラリ (`ahc_vdsl.rs`) の使い方

`rust/src/ahc_vdsl.rs` を使うと、プロトコル仕様を意識せずに型安全にビジュアライザ出力を生成できます。

### セットアップ
`main.rs`を解答を含むコード、`Cargo.toml`を解答を

1. `src/ahc_vdsl.rs` をコピーし、`main.rs`にペーストします。
2. `Cargo.toml` に以下を追加します:

```toml
[dependencies]
rustc-hash = "=1.1.0"

[features]
vis = []
```

3. `main.rs` 上で以下の

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

    // 10x10のグリッドを作成
    let grid = VisGrid::new(10, 10);
    
    // フレームを作成してスコアを設定
    let frame = VisFrame::new();
    
    // フレームを追加
    vis.add_frame("default", frame);
    
    // 全てのフレームを出力
    vis.output_all();
}
```

#### 2. セルの色とテキストを設定

```rust
let mut grid = VisGrid::new(10, 10);

// セルの色を変更 (x, y) = (3, 5) を赤に
grid.update_cell_color((3, 5), RED);

// セルにテキストを表示するには from_cells を使う
let cell_texts: Vec<Vec<String>> = (0..10)
    .map(|i| (0..10).map(|j| format!("{}", i * 10 + j)).collect())
    .collect();
let grid = VisGrid::from_cells(&cell_texts);
```

#### 3. 複数フレームのアニメーション

```rust
let mut vis = VisRoot::new();

for step in 0..100 {
    let mut grid = VisGrid::new(10, 10);
    
    // 現在位置をハイライト
    let pos = (step % 10, step / 10);
    grid.update_cell_color(pos, BLUE);
    
    let mut frame = VisFrame::new_grid(grid, step * 100);
    frame.add_textarea(format!("Step: {}", step));
    
    vis.add_frame("main", frame);
}

vis.output_all();
```

#### 4. 複数モードの使用

```rust
let mut vis = VisRoot::new();

// メインモード用のフレーム
let main_grid = VisGrid::new(20, 20);
vis.add_frame("main", VisFrame::new_grid(main_grid, 1000));

// デバッグモード用のフレーム
let debug_grid = VisGrid::new(5, 5);
let mut debug_frame = VisFrame::new_grid(debug_grid, 0);
debug_frame.enable_debug();  // 生のコマンドを表示
vis.add_frame("debug", debug_frame);

vis.output_all();
```

#### 5. 2D平面描画

```rust
let mut plane = Vis2DPlane::new(100.0, 100.0);

// 円を追加
plane.add_circle(BLACK, RED, 50.0, 50.0, 10.0);

// 線を追加
plane.add_line(BLUE, 0.0, 0.0, 100.0, 100.0);

// 多角形を追加
plane.add_polygon(GREEN, YELLOW, vec![
    (10.0, 10.0),
    (90.0, 10.0),
    (90.0, 90.0),
    (10.0, 90.0),
]);

let frame = VisFrame::new_2d_plane(plane, 5000);
```

#### 6. キャンバスに複数のアイテムを配置

```rust
let mut frame = VisFrame::new();

// キャンバスサイズを設定 (高さ800, 幅1000)
frame.set_canvas(VisCanvas::new(800.0, 1000.0));

// 左側にグリッドを配置
let mut grid1 = VisGrid::with_bounds(20, 20, ItemBounds::new(0.0, 0.0, 800.0, 800.0));
grid1.update_cell_color((5, 5), RED);
frame.add_grid(grid1);

// 右側に別のグリッドを配置
let grid2 = VisGrid::with_bounds(10, 1, ItemBounds::new(850.0, 0.0, 950.0, 800.0));
frame.add_grid(grid2);

frame.set_score("12345".to_string());
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

| 構造体       | 説明                                       |
| ------------ | ------------------------------------------ |
| `VisRoot`    | 全てのフレームを管理するルートオブジェクト |
| `VisFrame`   | 1つのフレーム（COMMITで区切られる単位）    |
| `VisCanvas`  | キャンバスのサイズ設定                     |
| `VisGrid`    | グリッド（盤面）の描画                     |
| `Vis2DPlane` | 2次元平面上の図形描画                      |
| `ItemBounds` | キャンバス内でのアイテムの位置指定         |
| `Color`      | RGB色                                      |
