# AHC-VDSL　(AHC Visualization Domain-Specific Language)

AHC-VDSLはAtCoder Heuristic Contestなどのヒューリスティックコンテストにおけるvisualizerを作成するための言語です。

AHCでは、基本的に公式visualizerが提供される一方で、visualizerを変更したいことがよくあります。例えば、焼きなまし法を実行したあとにどのように解が変更していくかを見たいといった場合や、デバッグの手助けに使いたい場合などがあります。
visualizerを作る際に、HTML/JavaScriptでwebページを実装することが考えられますが、以下の課題があります。
- コンテスト中は問題の考察や解法の実装に集中したいが、Visualizerの実装のために時間を割く必要がある
- 問題固有のロジックを提出コードに実装するのに加え、Visualizerの実装でも行う必要があり冗長

AHC-VDSLは実行時の出力から特定のプレフィックス（`$v`）を持つ行をパースし、アニメーションや盤面情報を描画します。
これによって、解答のコード内でAHC-VDSLのコードを生成することによって簡単にvisualizerを自作することができます。

詳細は以下のリンクを参照してください
- [サンプル一覧](https://hiro116s.github.io/ahc-vdsl/samples) - 作成できるvisualizerの一例を紹介しています
- [SPECIFICATIONS.md](SPECIFICATIONS.md) - DSLの詳しい仕様が書いてあります
- [rust/README.md](rust/README.md) - RustのAHC VDSLのwrapperの使い方
- [cpp/README.md](cpp/README.md) - C++のAHC VDSLのwrapperの使い方

## 使い方
AHC-VDSLを記述するために、ライブラリを使用することをおすすめします。現時点ではC++とRustがあります。ここに存在しない言語もLLMに頼めば実装してくれるかもしれません。

1. `{rust,cpp}/README.md`に沿って実装し、DSLを生成する
1. https://hiro116s.github.io/ahc-vdsl を開く
   - または[ahc-vdsl](https://github.com/hiro116s/ahc-vdsl)をcloneし、ローカルでvisualizerを立ち上げる
1. DSLを含むファイルを選択すると、
## プロトコル仕様

