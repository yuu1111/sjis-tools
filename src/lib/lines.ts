/**
 * @description 行操作ユーティリティ
 */

import { exitWithError } from "./cli";
import { decodeCP932, encodeCP932, readFileAsBuffer } from "./cp932";

/**
 * @description NaN値がないかチェックし、あればエラー終了
 * @param value - チェック対象の数値
 * @param label - エラーメッセージ用ラベル
 */
function requireFiniteNumber(value: number, label: string): void {
	if (!Number.isFinite(value)) {
		exitWithError(`Invalid ${label}: must be a finite number`);
	}
}

/**
 * @description 行範囲を表すタプル [開始行, 終了行] (1-indexed, inclusive)
 */
export type LineRange = [number, number];

/**
 * @description テキストを行配列に分割
 * @param content - 分割するテキスト
 * @returns 行配列
 */
export function splitLines(content: string): string[] {
	return content.split(/\r?\n/);
}

/**
 * @description 行配列をCRLF改行で結合
 * @param lines - 結合する行配列
 * @returns CRLF改行で結合されたテキスト
 */
export function joinLines(lines: string[]): string {
	return lines.join("\r\n");
}

/**
 * @description ファイルを読み込んで行配列として返す
 * @param filePath - 読み込むファイルパス
 * @returns 行配列
 */
export function readFileAsLines(filePath: string): string[] {
	const buffer = readFileAsBuffer(filePath);
	const content = decodeCP932(buffer);
	return splitLines(content);
}

/**
 * @description 行範囲を検証
 * @param start - 開始行 (1-indexed)
 * @param end - 終了行 (1-indexed, inclusive)
 * @param totalLines - 総行数
 */
export function validateLineRange(
	start: number,
	end: number,
	totalLines: number,
): void {
	if (start < 1 || end > totalLines || start > end) {
		exitWithError(`Invalid line range: ${start}-${end} (total: ${totalLines})`);
	}
}

/**
 * @description 行範囲文字列をパース
 * @param rangesStr - カンマ区切りの範囲文字列 (例: "616-1811,3147-3915")
 * @returns パースされた行範囲配列
 */
export function parseLineRanges(rangesStr: string): LineRange[] {
	return rangesStr.split(",").map((r) => {
		const parts = r
			.trim()
			.split("-")
			.map((n) => Number.parseInt(n, 10));
		const start = parts[0] ?? Number.NaN;
		const end = parts[1] ?? Number.NaN;
		requireFiniteNumber(start, "start line");
		requireFiniteNumber(end, "end line");
		return [start, end] as LineRange;
	});
}

/**
 * @description 行配列からCP932エンコードされたバッファを作成
 * @param lines - 行配列
 * @returns CP932エンコードされたバッファ
 */
export function linesToCP932Buffer(lines: string[]): Buffer {
	return encodeCP932(joinLines(lines));
}
