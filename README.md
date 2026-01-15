# Agent Session Print

Claude Code と Codex CLI のセッション履歴を閲覧・エクスポートするTUIツール。

## 機能

- **セッション一覧表示**: Claude Code / Codex のセッションをタイムスタンプ順に一覧表示
- **タブ切り替え**: TABキーで Claude Code と Codex を切り替え
- **セッション詳細表示**: メタ情報（ID、日時、作業ディレクトリ、Gitブランチなど）と会話履歴を表示
- **エクスポート機能**: プレーンテキストまたはHTML形式でエクスポート

## セッションファイルの場所

| Agent | パス | ファイル形式 |
|-------|------|-------------|
| Claude Code | `~/.claude/projects/<project>/` | `*.jsonl` |
| Codex CLI | `~/.codex/sessions/` | `rollout-*.jsonl`, `rollout-*.json` |

## インストール

```bash
bun install
```

## 使い方

```bash
bun run start
```

### キーボード操作

| キー | 動作 |
|------|------|
| `↑` `↓` | セッション選択 |
| `Enter` | セッション詳細を表示 |
| `TAB` | Claude Code / Codex 切り替え |
| `t` | テキスト形式でエクスポート |
| `h` | HTML形式でエクスポート |
| `q` / `ESC` | 戻る / 終了 |

### エクスポート

エクスポートしたファイルは `./exported/` ディレクトリに保存されます。

- **テキスト形式**: `session-<id>.txt`
- **HTML形式**: `session-<id>.html` - CSSスタイル付き、長いメッセージは折りたたみ表示

#### エクスポートオプション（デフォルト）

| オプション | デフォルト |
|-----------|-----------|
| user メッセージ | 有効 |
| assistant メッセージ | 有効 |
| ツール利用 | 無効 |
| thinking | 無効 |

## 技術スタック

- TypeScript
- Bun
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs

## 開発

```bash
# 開発モード（ファイル変更時に自動再起動）
bun run dev
```

## ライセンス

MIT
