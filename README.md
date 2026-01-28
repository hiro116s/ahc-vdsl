# AHC VDSL

このビジュアライザは、`vis/index.html` 単体で動作するWebベースのツールです。
実行時の出力から特定のプレフィックス（`$v`）を持つ行をパースし、アニメーションや盤面情報を描画します。

## 使い方

1. ヒューリスティックコンテストのプログラムを実行し、標準エラー出力を `err/{seed}.txt` に保存します。
   - 同時に `in/{seed}.txt`, `out/{seed}.txt` もあると入力・出力欄に表示されます。
2. `vis/index.html` をブラウザで開きます。 
   - ※ローカルサーバ経由で開くか、ブラウザのセキュリティ設定によってはローカルファイルの読み込みに制限がある場合があります。VS Codeの "Live Server" 拡張機能などを使うとスムーズです。
3. 画面上の "Seed" 入力欄にシード番号（例: 0）を入力すると、自動的に対応するファイルの読み込みと描画が行われます。

## プロトコル仕様

プログラムから以下のフォーマットで標準エラー出力に行を出力することで、ビジュアライザを制御できます。
全てのコマンドは `$v(MODE)` または `$v` で始まります。

- `MODE`: 任意の文字列（数字、アルファベット等）。これにより表示モードを切り替えることができます。
- `MODE` を省略して `$v` と書いた場合は、自動的に `default` モードとして扱われます。

例:
```text
$v(main) GRID ...
$v(sub) TEXTAREA ...
```

### 0. キャンバス設定: `$v(MODE) CANVAS`

キャンバスのサイズを指定します。このコマンドを使用しない場合、デフォルトで800x800のキャンバスが使用されます。

**基本構文:**
```text
$v(MODE) CANVAS [H] [W]
```
- `H`: キャンバスの高さ
- `W`: キャンバスの幅

CANVASコマンドを使用することで、複数のItem（GRID、2D_PLANE）を同一のキャンバス内に配置することができます。

### 1. フレーム区切り: `$v(MODE) COMMIT`

現在のフレームの描画コマンドを確定し、次のフレームへ移行します。
これを出力するたびに、Web上のスライダーで操作できる「1ステップ」が記録されます。
モードごとに独立してフレームが進みます。

```text
$v(MODE) COMMIT
```

### 2. グリッド描画: `$v(MODE) GRID`

盤面（グリッド）を描画します。

**基本構文:**
```text
$v(MODE) GRID [H] [W] [BORDER_COLOR] [TEXT_COLOR] [DEFAULT_CELL_COLOR]
```

**キャンバス内の位置指定（オプション）:**
```text
$v(MODE) GRID(left, top, right, bottom) [H] [W] [BORDER_COLOR] [TEXT_COLOR] [DEFAULT_CELL_COLOR]
```
- `H`: 行数
- `W`: 列数
- `BORDER_COLOR`: グリッド線の色（例: `#000000`, `black`）
- `TEXT_COLOR`: 文字色
- `DEFAULT_CELL_COLOR`: デフォルトの背景色
- `left, top, right, bottom` (オプション): キャンバス内での相対的な位置を指定します。省略した場合はキャンバス全体に描画されます。

この行の直後に、以下のセクションヘッダを使用して詳細データを記述します（ここは `$v` プレフィックス無し）。

#### A. セル背景色 (全指定): `CELL_COLORS`

全セルの色を行ごとに指定します。

```text
CELL_COLORS
#FFFFFF #FF0000 ... (W個の色)
#00FF00 #0000FF ...
... (H行分)
```

#### B. セル背景色 (部分指定): `CELL_COLORS_POS`

変化があったセルだけ色を指定したい場合に便利です。

```text
CELL_COLORS_POS
[グループ数N]
[色] [個数K] [r1] [c1] [r2] [c2] ... (K個の座標ペア)
... (N行分)
```

#### C. セル内テキスト: `CELL_TEXT`


セルの中に文字を表示します。

```text
CELL_TEXT
text1 "text with space" ... (W個)
... (H行分)
```

#### D. 線描画: `LINES`

グリッド上に線分を描画します。

```text
LINES
[線のグループ数N]
[色] [頂点数K] [x1] [y1] [x2] [y2] ... (K個の頂点座標)
... (N行分)
```
※ 座標は (x=列, y=行) です。

### 3. 2次元平面描画: `$v(MODE) 2D_PLANE`

2次元座標平面上に図形（円、線、多角形）を描画します。

**基本構文:**
```text
$v(MODE) 2D_PLANE [H] [W]
```

**キャンバス内の位置指定（オプション）:**
```text
$v(MODE) 2D_PLANE(left, top, right, bottom) [H] [W]
```
- `H`: 縦方向の座標最大値
- `W`: 横方向の座標最大値
- `left, top, right, bottom` (オプション): キャンバス内での相対的な位置を指定します。省略した場合はキャンバス全体に描画されます。

この行の直後に、以下のセクションヘッダを使用して詳細データを記述します（ここは `$v` プレフィックス無し）。

座標 (x, y) は、指定された描画領域内で `x / W * draw_width`, `y / H * draw_height` の位置に投影されます。

#### A. 円描画: `CIRCLES`

円を描画します。

```text
CIRCLES
[円グループ数 cn]
[線の色] [塗りつぶしの色] [円の数] [x0] [y0] [r0] [x1] [y1] [r1] ...
... (cnグループ分)
```
- 各グループで、同じ線の色と塗りつぶしの色を持つ円を複数指定できます
- `x`, `y`: 円の中心座標
- `r`: 円の半径

#### B. 線描画: `LINES`

線分を描画します。

```text
LINES
[線グループ数 ln]
[色] [線の数] [ax0] [ay0] [bx0] [by0] [ax1] [ay1] [bx1] [by1] ...
... (lnグループ分)
```
- 各グループで、同じ色の線を複数指定できます
- `(ax, ay)` から `(bx, by)` への線分を描画します

#### C. 多角形描画: `POLYGONS`

多角形を描画します。

```text
POLYGONS
[多角形数 pn]
[線の色] [塗りつぶしの色] [頂点数] [x0] [y0] [x1] [y1] ...
... (pnグループ分)
```
- 各多角形は、指定された頂点を結んで閉じた図形を描画します（最初の点と最後の点が自動的に結ばれます）

**Item（GRID・2D_PLANE）の複数配置について:**

CANVASコマンドと位置指定を使用することで、複数のGRIDや2D_PLANEを同一フレーム内に配置できます。
ただし、Itemが重なっている場合はエラーが表示されます。

例:
```text
$v(main) CANVAS 800 800
$v(main) GRID(0, 0, 400, 400) 10 10 #ddd black white
$v(main) 2D_PLANE(400, 0, 800, 400) 100 100
$v(main) COMMIT
```

### 4. 情報パネル (テキストエリア): `$v(MODE) TEXTAREA`

画面右側の情報パネルに複数行のテキストエリアを追加します（長い情報向け）。

```text
$v(MODE) TEXTAREA DebugInfo: ...
```

### 5. スコア更新: `$v(MODE) SCORE`

画面上部の「Score = ...」の表示を更新します。

```text
$v(MODE) SCORE 12345
```

### 6. デバッグ表示: `$v(MODE) DEBUG`

このコマンドが含まれるフレームでは、そのフレームを構成するために出力された生のコマンド文字列を、ビジュアライザの右側に追加表示します。デバッグ用途に便利です。

```text
$v(MODE) DEBUG
```

---

## 2D_PLANE コマンドの使用例

```rust
// 100x100の2次元平面を設定
eprintln!("$v(main) 2D_PLANE 100 100");

// 円を描画
eprintln!("CIRCLES");
eprintln!("2");  // 2グループの円
eprintln!("red blue 2 50 50 10 70 30 5");  // 赤い線、青い塗り、2つの円
eprintln!("green yellow 1 25 75 8");  // 緑の線、黄色い塗り、1つの円

// 線を描画
eprintln!("LINES");
eprintln!("1");  // 1グループの線
eprintln!("black 3 0 0 100 100 0 100 100 0 50 0 50 100");  // 黒い線3本

// 多角形を描画
eprintln!("POLYGONS");
eprintln!("1");  // 1つの多角形
eprintln!("purple pink 4 10 10 90 10 90 90 10 90");  // 紫の線、ピンクの塗り、四角形

// フレームを確定
eprintln!("$v(main) COMMIT");
```

---

## 実装例 (Rust)

```rust
// メインモードでグリッド初期化
eprintln!("$v(main) GRID 30 30 #ddd black white");

// サブモードで別の情報を表示
eprintln!("$v(debug) TEXTAREA Start Processing...");

// デバッグ表示を有効にする
eprintln!("$v(main) DEBUG");

// ... 処理 ...

// メインモードのフレーム更新
eprintln!("$v(main) SCORE {}", score);
eprintln!("$v(main) COMMIT");
```
