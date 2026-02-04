# AHC-VDSL Visualizer

AHC-VDSLプロトコルをWebブラウザで可視化するためのビジュアライザーです。

## 概要

このビジュアライザーは、AHC-VDSLプロトコルで記述された標準エラー出力を解析し、グリッド、2D平面、グラフなどをインタラクティブに表示します。

### 主な機能

- **グリッド描画**: セルの色、テキスト、線、壁などを表示
- **2D平面描画**: 円、線、多角形などの図形を描画
- **バーグラフ**: 数値データを視覚的に比較
- **マルチモード対応**: 複数の表示モードを切り替え可能
- **アニメーション**: フレームごとのアニメーション再生（速度調整可能、最大180fps）
- **サンプルギャラリー**: サンプル問題のプレビュー

## 開発者向けガイド

### 前提条件

- Node.js (v14以降推奨)
- npm

### セットアップ

```bash
cd visualizer
npm install
```

### 開発サーバーの起動

開発サーバーを起動すると、ブラウザで自動的に開きます：

```bash
npm run dev
```

デフォルトで `http://localhost:8080` で起動します。

### ビルド

本番用にビルドする場合：

```bash
npm run build
```

ビルドされたファイルは `dist/` ディレクトリに出力されます。

### 開発中の自動リビルド

ファイルの変更を監視して自動的にリビルドする場合：

```bash
npm run watch
```

## プロジェクト構成

```
visualizer/
├── src/
│   ├── index.ts         # メインエントリーポイント
│   ├── parser.ts        # AHC-VDSLプロトコルのパーサー
│   ├── renderer.ts      # SVG描画ロジック
│   ├── types.ts         # TypeScript型定義
│   ├── samples.ts       # サンプルデータ管理
│   ├── utils.ts         # ユーティリティ関数
│   ├── styles.css       # スタイルシート
│   └── index.html       # HTMLテンプレート
├── samples/             # サンプルデータファイル
│   ├── index.json       # サンプル一覧
│   └── *.txt            # サンプルデータ
├── dist/                # ビルド出力先
├── package.json         # 依存関係定義
├── tsconfig.json        # TypeScript設定
├── webpack.config.js    # Webpack設定
└── README.md            # このファイル
```

## 技術スタック

- **TypeScript**: 型安全な開発
- **Webpack**: モジュールバンドラー
- **webpack-dev-server**: 開発サーバー
- **SVG**: ベクターグラフィックス描画

## プロトコル仕様

AHC-VDSLプロトコルの詳細は [../SPECIFICATIONS.md](../SPECIFICATIONS.md) を参照してください。

## サンプルの追加

新しいサンプルを追加する場合：

1. `samples/` ディレクトリにサンプルファイル（`.txt`）を配置
2. `samples/index.json` にサンプル情報を追加
3. サンプルファイルには標準エラー出力形式で AHC-VDSL プロトコルを記述

## トラブルシューティング

### ポートが既に使用されている

デフォルトのポート（8080）が使用中の場合、別のポートを指定できます：

```bash
npm run dev -- --port 3000
```

### ビルドエラー

依存関係の問題が発生した場合：

```bash
rm -rf node_modules package-lock.json
npm install
```

## ライセンス

このプロジェクトのライセンスについては、ルートディレクトリの LICENSE ファイルを参照してください。
