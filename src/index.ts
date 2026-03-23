/**
 * @description SJIS/CP932ファイル編集ライブラリ
 */

export {
	type EncodingType,
	createCP932File,
	decodeCP932,
	detectEncoding,
	encodeCP932,
	isValidCP932,
	normalizeToCRLF,
	readFileAsBuffer,
	replaceInBuffer,
	writeBufferToFile,
} from "./lib/cp932.js";

export {
	createBackup,
	removeBackup,
	restoreFromBackup,
	validateCP932OrRestore,
} from "./lib/file-ops.js";

export {
	type LineRange,
	joinLines,
	linesToCP932Buffer,
	parseLineRanges,
	readFileAsLines,
	splitLines,
	validateLineRange,
} from "./lib/lines.js";
