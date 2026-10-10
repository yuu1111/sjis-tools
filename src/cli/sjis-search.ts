/**
 * CP932/UTF-8ファイル検索CLI
 */

import { exitWithError, parseArgsWithOptions } from "../lib/cli";
import { searchFiles } from "../lib/search";

/**
 * 使用方法
 */
const USAGE = [
	"Usage: sjist search <pattern> [paths...] [options]",
	"",
	"Options:",
	"  --include <glob>   Only search files whose name matches the glob (e.g. *.hsp)",
	"  --exclude <glob>   Skip files whose name matches the glob",
	"  -i, --ignore-case  Case-insensitive match",
	"  -e, --regex        Treat the pattern as a regular expression",
	"  --limit <n>        Stop after n matches",
	"",
	"Matches are printed as <path>:<line>:<text>. Exit code is 1 when nothing matched.",
].join("\n");

/**
 * CLIエントリーポイント
 */
export function main(): void {
	const { values, flags, positionals } = parseArgsWithOptions(
		process.argv.slice(2),
		["--include", "--exclude", "--limit"],
		["-i", "--ignore-case", "-e", "--regex", "-h", "--help"],
	);

	if (flags.has("-h") || flags.has("--help")) {
		console.log(USAGE);
		return;
	}

	const pattern = positionals[0];
	if (pattern === undefined) {
		exitWithError(USAGE);
	}

	const regex = flags.has("-e") || flags.has("--regex");
	if (regex) {
		try {
			new RegExp(pattern);
		} catch (error) {
			exitWithError(`Invalid regular expression: ${String(error)}`);
		}
	}

	const limitValue = values["--limit"];
	const matches = searchFiles({
		pattern,
		paths: positionals.length > 1 ? positionals.slice(1) : ["."],
		include: values["--include"],
		exclude: values["--exclude"],
		ignoreCase: flags.has("-i") || flags.has("--ignore-case"),
		regex,
		limit: limitValue ? Number.parseInt(limitValue, 10) : 0,
	});

	for (const match of matches) {
		console.log(`${match.path}:${match.lineNumber}:${match.line}`);
	}

	if (matches.length === 0) {
		process.exit(1);
	}
}
