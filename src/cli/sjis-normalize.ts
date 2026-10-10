/**
 * CP932ファイルを正規化してUTF-8で出力するCLI
 */

import * as fs from "node:fs";
import {
	exitWithError,
	parseArgsWithOptions,
	requireFileExists,
	resolvePath,
} from "../lib/cli";
import {
	HSP_RULES,
	type NormalizeRule,
	normalizeText,
	parseRules,
} from "../lib/normalize";
import { decodeFileForSearch } from "../lib/search";

/**
 * 使用方法
 */
const USAGE = [
	"Usage: sjist normalize <file> [options]",
	"",
	"Decode a CP932/UTF-8 file and write it as UTF-8 (stdout by default).",
	"",
	"Options:",
	"  --out <file>     Write to <file> instead of stdout",
	"  --hsp            Apply the built-in HSP decompile rules (*label_NNNN, prm_NNNN)",
	"  --rules <json>   Apply custom rules: [{pattern, replacement}, ...]",
].join("\n");

/**
 * CLIエントリーポイント
 */
export function main(): void {
	const { values, flags, positionals } = parseArgsWithOptions(
		process.argv.slice(2),
		["--out", "--rules"],
		["--hsp", "-h", "--help"],
	);

	if (flags.has("-h") || flags.has("--help")) {
		console.log(USAGE);
		return;
	}

	const file = positionals[0];
	if (file === undefined || positionals.length !== 1) {
		exitWithError(USAGE);
	}

	const rules: NormalizeRule[] = [];
	if (flags.has("--hsp")) {
		rules.push(...HSP_RULES);
	}
	const rulesJson = values["--rules"];
	if (rulesJson !== undefined) {
		try {
			rules.push(...parseRules(rulesJson));
		} catch (error) {
			exitWithError(`Invalid rules: ${String(error)}`);
		}
	}

	const filePath = requireFileExists(file);
	const text = decodeFileForSearch(filePath);
	if (text === null) {
		exitWithError(`Unsupported encoding: ${filePath}`);
	}

	const normalized = rules.length > 0 ? normalizeText(text, rules) : text;
	const output = normalized.replace(/\r\n/g, "\n");
	const out = values["--out"];
	if (out !== undefined) {
		fs.writeFileSync(resolvePath(out), output, "utf8");
		console.log(`Wrote ${resolvePath(out)}`);
	} else {
		process.stdout.write(output);
	}
}
