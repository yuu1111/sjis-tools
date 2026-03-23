#!/usr/bin/env node
/**
 * @description SJIS/CP932ファイルのエンコーディング修復CLI(UTF-8からCP932へ変換)
 */

import { exitWithError, parseArgs, requireFileExists } from "../lib/cli.js";
import {
	detectEncoding,
	encodeCP932,
	normalizeToCRLF,
	readFileAsBuffer,
	writeBufferToFile,
} from "../lib/cp932.js";
import { createBackup, validateCP932OrRestore } from "../lib/file-ops.js";

/**
 * @description CLIエントリーポイント
 */
function main(): void {
	const args = parseArgs(1, "Usage: sjis-encoding-repair <file>");
	const filePath = requireFileExists(args[0]);

	const buffer = readFileAsBuffer(filePath);
	const encoding = detectEncoding(buffer);

	console.log(`Detected encoding: ${encoding}`);

	if (encoding === "cp932") {
		console.log("File is already CP932. No repair needed.");
		return;
	}

	if (encoding === "unknown") {
		exitWithError("Unknown encoding. Cannot repair automatically.");
	}

	const backupPath = createBackup(filePath);

	// BOMがあればスキップしてUTF-8としてデコード
	const utf8Bytes = encoding === "utf8-bom" ? buffer.subarray(3) : buffer;
	const content = utf8Bytes.toString("utf8");

	const cp932Buffer = normalizeToCRLF(encodeCP932(content));
	writeBufferToFile(filePath, cp932Buffer);

	validateCP932OrRestore(filePath, backupPath, {
		keepOnSuccess: true,
		errorMessage: "Repair failed. Restoring backup...",
	});

	console.log(`Successfully repaired: ${filePath}`);
	console.log(`Backup kept at: ${backupPath}`);
}

main();
