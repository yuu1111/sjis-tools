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
sjist create <file> <content>
sjist create <file> --stdin
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

## Safety

- Automatic backup before destructive operations (`.bak` files)
- CP932 roundtrip validation after every write
- Backup restoration on validation failure

## License

MIT
