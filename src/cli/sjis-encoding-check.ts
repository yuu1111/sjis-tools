#!/usr/bin/env node
/**
 * @description SJIS/CP932ファイルのエンコーディング検証CLI
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "../lib/cli.js";
import { decodeCP932, encodeCP932, readFileAsBuffer } from "../lib/cp932.js";

/**
 * @description エンコーディング検証結果
 * @property file - 検証対象ファイルパス
 * @property valid - 検証成功ならtrue
 * @property error - エラーメッセージ @optional
 */
interface CheckResult {
	file: string;
	valid: boolean;
	error?: string;
}

/**
 * @description 単一ファイルのエンコーディングを検証
 * @param filePath - 検証対象ファイルパス
 * @returns 検証結果
 */
function checkFile(filePath: string): CheckResult {
	const absolutePath = path.resolve(filePath);

	if (!fs.existsSync(absolutePath)) {
		return { file: filePath, valid: false, error: "File not found" };
	}

	const buffer = readFileAsBuffer(absolutePath);

	let content: string;
	try {
		content = decodeCP932(buffer);
		if (!buffer.equals(encodeCP932(content))) {
			return { file: filePath, valid: false, error: "Invalid CP932 encoding" };
		}
	} catch {
		return { file: filePath, valid: false, error: "Invalid CP932 encoding" };
	}

	const hasLF = content.includes("\n");
	const hasCRLF = content.includes("\r\n");
	if (hasLF && !hasCRLF) {
		return {
			file: filePath,
			valid: false,
			error: "Line ending should be CRLF",
		};
	}

	return { file: filePath, valid: true };
}

/**
 * @description CLIエントリーポイント
 */
function main(): void {
	const files = parseArgs(
		1,
		"Usage: sjis-encoding-check <file1> [file2] ...",
	);

	const results = files.map(checkFile);
	const failures = results.filter((r) => !r.valid);

	if (failures.length > 0) {
		console.error("Encoding check failed:");
		for (const f of failures) {
			console.error(`  ${f.file}: ${f.error}`);
		}
		process.exit(1);
	}

	console.log(`All ${results.length} file(s) passed encoding check`);
}

main();
