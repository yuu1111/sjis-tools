/**
 * @description SJIS/CP932ファイルの新規作成CLI
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { parseArgs, requireFileNotExists } from "../lib/cli";
import { createCP932File, isValidCP932, readFileAsBuffer } from "../lib/cp932";

/**
 * @description 標準入力から全行を読み込む
 * @returns 読み込んだテキスト
 */
async function readStdin(): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		crlfDelay: Infinity,
	});

	const lines: string[] = [];
	for await (const line of rl) {
		lines.push(line);
	}
	return lines.join("\n");
}

/**
 * @description CLIエントリーポイント
 */
export async function main(): Promise<void> {
	const args = parseArgs(
		2,
		"Usage: sjist create <output-file> <content>\n       sjist create <output-file> --stdin",
	);

	const outputPath = requireFileNotExists(
		args[0],
		`File already exists: ${path.resolve(args[0])}\nUse sjis-replace for existing files`,
	);

	let content: string;
	if (args[1] === "--stdin") {
		content = await readStdin();
	} else {
		content = args[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t");
	}

	const dir = path.dirname(outputPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	createCP932File(outputPath, content, true);

	const buffer = readFileAsBuffer(outputPath);
	if (!isValidCP932(buffer)) {
		console.error("Error: Created file is not valid CP932");
		fs.unlinkSync(outputPath);
		process.exit(1);
	}

	console.log(`Created CP932 file: ${outputPath}`);
}
