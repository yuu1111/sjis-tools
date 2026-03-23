/**
 * @description SJIS/CP932ファイルから指定行範囲を抽出して新規ファイルを作成するCLI
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
	exitWithError,
	parseArgs,
	readFileWithCP932Warning,
	requireFileExists,
} from "../lib/cli";
import { decodeCP932, isValidCP932, writeBufferToFile } from "../lib/cp932";
import {
	type LineRange,
	linesToCP932Buffer,
	parseLineRanges,
	splitLines,
	validateLineRange,
} from "../lib/lines";

/**
 * @description CLIエントリーポイント
 */
export function main(): void {
	const args = parseArgs(
		3,
		'Usage: sjist extract-lines <source> <output> <ranges>\n       ranges: comma-separated, e.g. "616-1811,3147-3915"',
	);

	const sourcePath = requireFileExists(args[0]);
	const outputPath = path.resolve(args[1]);
	const ranges: LineRange[] = parseLineRanges(args[2]);

	console.log(`Source: ${sourcePath}`);
	console.log(`Output: ${outputPath}`);
	console.log(`Ranges: ${ranges.map((r) => `${r[0]}-${r[1]}`).join(", ")}`);

	const buffer = readFileWithCP932Warning(sourcePath);
	const lines = splitLines(decodeCP932(buffer));
	console.log(`Total lines in source: ${lines.length}`);

	const extractedLines: string[] = [];
	for (const [start, end] of ranges) {
		validateLineRange(start, end, lines.length);
		const rangeLines = lines.slice(start - 1, end);
		extractedLines.push(...rangeLines);
		console.log(`Extracted lines ${start}-${end}: ${rangeLines.length} lines`);
	}

	const outputBuffer = linesToCP932Buffer(extractedLines);
	writeBufferToFile(outputPath, outputBuffer);

	if (!isValidCP932(outputBuffer)) {
		fs.unlinkSync(outputPath);
		exitWithError("Error: Output is not valid CP932");
	}

	console.log(
		`\nSuccessfully created ${outputPath} with ${extractedLines.length} lines`,
	);
}
