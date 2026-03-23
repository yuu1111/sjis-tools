#!/usr/bin/env node
/**
 * @description SJIS/CP932ファイルのバイナリ置換CLI
 */

import {
	exitWithError,
	parseArgs,
	requireFileExists,
	warnIfNotCP932,
} from "../lib/cli.js";
import {
	readFileAsBuffer,
	replaceInBuffer,
	writeBufferToFile,
} from "../lib/cp932.js";
import {
	createBackup,
	removeBackup,
	restoreFromBackup,
	validateCP932OrRestore,
} from "../lib/file-ops.js";

/**
 * @description 置換ペア
 * @property search - 検索文字列
 * @property replace - 置換文字列
 */
interface Replacement {
	search: string;
	replace: string;
}

/**
 * @description CLIエントリーポイント
 */
function main(): void {
	const args = parseArgs(
		3,
		'Usage: sjis-replace <file> <search> <replace>\n       sjis-replace <file> --json \'[{"search":"a","replace":"b"}]\'',
	);

	const filePath = requireFileExists(args[0]);

	const backupPath = createBackup(filePath);

	let buffer = readFileAsBuffer(filePath);
	warnIfNotCP932(buffer);

	let replacements: Replacement[];

	if (args[1] === "--json") {
		try {
			replacements = JSON.parse(args[2]);
		} catch {
			restoreFromBackup(filePath, backupPath);
			exitWithError("Error: Invalid JSON argument");
		}
	} else {
		replacements = [{ search: args[1], replace: args[2] }];
	}

	let totalReplaced = 0;
	for (const { search, replace } of replacements) {
		const result = replaceInBuffer(buffer, search, replace);
		buffer = result.buffer;

		if (result.count > 0) {
			console.log(`Replaced ${result.count}x: "${search}" -> "${replace}"`);
			totalReplaced += result.count;
		}
	}

	if (totalReplaced === 0) {
		console.log("No replacements made.");
		removeBackup(backupPath);
		return;
	}

	writeBufferToFile(filePath, buffer);

	validateCP932OrRestore(filePath, backupPath);

	console.log(
		`Successfully replaced ${totalReplaced} occurrence(s) in ${filePath}`,
	);
}

main();
