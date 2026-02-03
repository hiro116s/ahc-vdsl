# AHC-VDSL　(AHC Visualization Domain-Specific Language)

AHC-VDSLはAtCoder Heuristic Contestなどのヒューリスティックコンテストにおけるvisualizerを作成するための言語です。

AHCでは、基本的に公式visualizerが提供される一方で、visualizerを変更したいことがよくあります。例えば、焼きなまし法を実行したあとにどのように解が変更していくかを見たいといった場合や、デバッグの手助けに使いたい場合などがあります。
visualizerを作る際に、HTML/JavaScriptでwebページを実装することが考えられますが、以下の課題があります。
- コンテスト中は問題の考察や解法の実装に集中したいが、Visualizerの実装のために時間を割く必要がある
- 問題固有のロジックを提出コードに実装するのに加え、Visualizerの実装でも行う必要があり冗長

AHC-VDSLは実行時の出力から特定のプレフィックス（`$v`）を持つ行をパースし、アニメーションや盤面情報を描画します。
これによって、解答のコード内でAHC-VDSLのコードを生成することによって簡単にvisualizerを自作することができます。

どのようなvisualizerを作成できるかは[サンプル一覧]()を参照してください

## 使い方
AHC-VDSLを記述するために、ライブラリを使用することをおすすめします。現時点ではC++とRustがあります。ここに存在しない言語もLLMに頼めば実装してくれるかもしれません。

1. `rust/README.md`または`cpp/README.md`に沿って実装する
2. `atcoder`
3. `vis/index.html` をブラウザで開きます。 
   - ※ローカルサーバ経由で開くか、ブラウザのセキュリティ設定によってはローカルファイルの読み込みに制限がある場合があります。VS Codeの "Live Server" 拡張機能などを使うとスムーズです。
4. 画面上の "Seed" 入力欄にシード番号（例: 0）を入力すると、自動的に対応するファイルの読み込みと描画が行われます。

## プロトコル仕様

プロトコル仕様の詳細は [SPECIFICATIONS.md](SPECIFICATIONS.md) を参照してください。
