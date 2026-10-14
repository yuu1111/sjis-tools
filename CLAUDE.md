# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run build        # esbuildでバンドル (dist/cli.js を生成)
bun run typecheck    # TypeScript型チェック (tsc --noEmit)
bun run lint         # Biome lint
bun run format       # Biome format (--write --unsafe)
bun test             # 全テスト実行 (ビルド→テスト)
bun test tests/lib/cp932.test.ts           # 単一ファイルテスト
bun test --test-name-pattern "replace"     # パターンでフィルタ
```

## Architecture

SJIS/CP932ファイルをバイナリレベルで安全に編集するCLIツールAIエージェントがSJISファイルを壊さずに編集できることを目的としている

### エントリーポイント

`src/cli.ts` が単一のエントリーポイント`sjist <subcommand>` 形式で、サブコマンド名を `process.argv` から除去してから各コマンドの `main()` を呼ぶ

### レイヤー構造

- **`src/cli/`** - 各サブコマンドの実装それぞれ `main()` をエクスポート
- **`src/lib/cp932.ts`** - CP932エンコード/デコード、バイナリ置換、エンコーディング検出中核モジュール
- **`src/lib/lines.ts`** - 行操作ユーティリティ (分割・結合・範囲パース)
- **`src/lib/file-ops.ts`** - バックアップ作成/復元、CP932ラウンドトリップ検証
- **`src/lib/cli.ts`** - 引数パース、ファイル存在チェック等のCLI共通処理

### 安全機構

破壊的操作の前に `.bak` バックアップを作成し、書き込み後にCP932ラウンドトリップ検証(decode→re-encode→比較)を実行検証失敗時はバックアップから自動復元するこの検証フローは `file-ops.ts` の `validateCP932OrRestore` に集約されている

### ビルド

esbuildで単一ファイルにバンドル後、shebang + minifiedコード1行の2行構成に圧縮する (`scripts/build.ts`)`iconv-lite` はexternalとして除外
