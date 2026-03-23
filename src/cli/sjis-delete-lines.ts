/**
 * @description SJIS/CP932ファイルの行範囲削除CLI
 */

import {
	parseArgs,
	readFileWithCP932Warning,
	requireFileExists,
} from "../lib/cli";
import { decodeCP932, writeBufferToFile } from "../lib/cp932";
import { createBackup, validateCP932OrRestore } from "../lib/file-ops";
import {
	linesToCP932Buffer,
	splitLines,
	validateLineRange,
} from "../lib/lines";

/**
 * @description CLIエントリーポイント
 */
export function main(): void {
	const args = parseArgs(
		3,
		"Usage: sjist delete-lines <file> <start-line> <end-line>\n       Lines are 1-indexed, inclusive",
	);

	const filePath = requireFileExists(args[0]);
	const startLine = Number.parseInt(args[1], 10);
	const endLine = Number.parseInt(args[2], 10);

	const backupPath = createBackup(filePath);

	const buffer = readFileWithCP932Warning(filePath);
	const lines = splitLines(decodeCP932(buffer));

	console.log(`Total lines: ${lines.length}`);
	console.log(`Deleting lines ${startLine} to ${endLine}`);

	validateLineRange(startLine, endLine, lines.length);

	console.log(
		`\nFirst line to delete (${startLine}): ${lines[startLine - 1]?.substring(0, 60) ?? ""}...`,
	);
	console.log(
		`Last line to delete (${endLine}): ${lines[endLine - 1]?.substring(0, 60) ?? ""}...`,
	);

	const newLines = [...lines.slice(0, startLine - 1), ...lines.slice(endLine)];

	const deletedCount = endLine - startLine + 1;
	console.log(`\nDeleted ${deletedCount} lines`);

	writeBufferToFile(filePath, linesToCP932Buffer(newLines));

	validateCP932OrRestore(filePath, backupPath, { keepOnSuccess: true });

	console.log(
		`Successfully deleted lines ${startLine}-${endLine} from ${filePath}`,
	);
	console.log(`Backup kept at: ${backupPath}`);
}
