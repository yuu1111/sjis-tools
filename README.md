# sjis-tools

CLI for safely editing SJIS/CP932 files — designed for AI agents.

Binary-level operations ensure encoding integrity is never broken. Every write is validated with a decode-reencode roundtrip, and automatic backups protect against corruption.

## Install

```bash
npm install -g sjis-tools
```

## Commands

### `sjist replace`

Replace text in a SJIS/CP932 file.

```bash
sjist replace <file> <search> <replace>
sjist replace <file> --json '[{"search":"old","replace":"new"}]'
```

### `sjist create`

Create a new SJIS/CP932 file.

```bash
sjist create <output-file> <content>
sjist create <output-file> --stdin
```

### `sjist delete-lines`

Delete a line range from a SJIS/CP932 file.

```bash
sjist delete-lines <file> <start-line> <end-line>
```

### `sjist extract-lines`

Extract a line range to a new SJIS/CP932 file.

```bash
sjist extract-lines <source> <output> <ranges>
# ranges: comma-separated, e.g. "616-1811,3147-3915"
```

### `sjist encoding-check`

Validate SJIS/CP932 encoding.

```bash
sjist encoding-check <file1> [file2] ...
```

### `sjist encoding-repair`

Repair encoding (convert UTF-8 to CP932).

```bash
sjist encoding-repair <file>
```

### `sjist search`

Search CP932/UTF-8 files for a text or regex pattern. Files are decoded before matching, so multibyte patterns work without mojibake.

```bash
sjist search <pattern> [paths...] [options]
```

| Option | Description |
|---|---|
| `--include <glob>` | Only search files whose name matches the glob (e.g. `*.hsp`) |
| `--exclude <glob>` | Skip files whose name matches the glob |
| `-i`, `--ignore-case` | Case-insensitive match |
| `-e`, `--regex` | Treat the pattern as a regular expression |
| `--limit <n>` | Stop after n matches |

Matches are printed as `<path>:<line>:<text>`. Exit code is 1 when nothing matched.

```bash
sjist search "邪悪" src --include "*.hsp"
sjist search -e "gettrait\(c, 132\)" src
```

### `sjist normalize`

Decode a CP932/UTF-8 file and write it as UTF-8, optionally applying normalization rules. Useful for diffing decompiled sources whose label/parameter numbers shift between versions.

```bash
sjist normalize <file> [--out <file>] [--hsp] [--rules <json>]
```

| Option | Description |
|---|---|
| `--out <file>` | Write to `<file>` instead of stdout |
| `--hsp` | Apply the built-in HSP decompile rules (`*label_NNNN`, `prm_NNNN`) |
| `--rules <json>` | Apply custom rules: `[{"pattern":"a","replacement":"b"}]` |

```bash
sjist normalize old.hsp --hsp --out old.norm.utf8.hsp
sjist normalize new.hsp --hsp --out new.norm.utf8.hsp
diff old.norm.utf8.hsp new.norm.utf8.hsp
```

## Safety

- Automatic backup before destructive operations (`.bak` files)
- CP932 roundtrip validation after every write
- Backup restoration on validation failure

## License

MIT
