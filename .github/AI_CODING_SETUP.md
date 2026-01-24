# AI Coding Assistant Setup Guide

## 概要

このリポジトリには、GitHub Issueに `ai coding` ラベルが付けられたときに自動的にClaude AIを使用してコードを生成し、Pull Requestを作成するワークフローが含まれています。

## セットアップ手順

### 1. Anthropic API Keyの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウントを作成またはログイン
3. **API Keys** セクションに移動
4. **Create Key** をクリックして新しいAPIキーを生成
5. 生成されたキーをコピー（一度しか表示されません）

### 2. GitHub Secretsの設定

1. リポジトリの **Settings** タブを開く
2. 左サイドバーの **Secrets and variables** → **Actions** をクリック
3. **New repository secret** をクリック
4. 以下の情報を入力:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Secret**: 取得したAnthropicのAPIキー
5. **Add secret** をクリック

### 3. GitHub Issueラベルの作成

1. リポジトリの **Issues** タブを開く
2. **Labels** をクリック
3. **New label** をクリック
4. 以下の情報を入力:
   - **Label name**: `ai coding`
   - **Description**: `AI will automatically implement this issue`
   - **Color**: 任意（例: `#7057ff`）
5. **Create label** をクリック

## 使用方法

1. 新しいIssueを作成
2. 実装してほしい内容を詳細に記述（具体的であるほど良い結果が得られます）
3. `ai coding` ラベルを付ける
4. ワークフローが自動的に実行され、以下が行われます:
   - 新しいブランチの作成（`ai-coding/issue-{番号}`）
   - Claude AIによるコード生成
   - 変更のコミット
   - Pull Requestの作成
   - Issueへのコメント

## モデルの変更

使用するAnthropicモデルを変更するには、`.github/workflows/ai-coding.yml` の以下の部分を編集します:

```yaml
env:
  # 利用可能なモデル:
  # - claude-sonnet-4-20250514 (推奨 - バランスが良い)
  # - claude-opus-4-20250514 (最高性能、コスト高)
  # - claude-3-5-sonnet-20241022 (旧バージョン)
  # - claude-3-5-haiku-20241022 (高速、低コスト)
  ANTHROPIC_MODEL: claude-sonnet-4-20250514
  ANTHROPIC_MAX_TOKENS: 8192
```

## 注意事項

- **セキュリティ**: APIキーは絶対に公開リポジトリにコミットしないでください
- **コスト管理**: Claude APIの使用には料金がかかります。使用量を監視してください
- **コードレビュー**: AI生成コードは必ず人間がレビューしてからマージしてください
- **複雑なタスク**: 非常に複雑なタスクは、より小さなIssueに分割することを推奨します

## トラブルシューティング

### ワークフローが実行されない

- `ai coding` ラベルが正確に設定されているか確認
- Actions タブでワークフローが有効になっているか確認

### APIエラーが発生する

- `ANTHROPIC_API_KEY` シークレットが正しく設定されているか確認
- APIキーが有効であるか確認
- Anthropicアカウントに十分なクレジットがあるか確認

### 変更が生成されない

- Issue の説明をより具体的に記述
- 期待するファイルパスや変更内容を明示
- モデルをより高性能なもの（claude-opus-4）に変更してみる

## ライセンス

このワークフローはリポジトリのライセンスに従います。
