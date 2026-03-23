/**
 * @description CLI共通ユーティリティ
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { isValidCP932, readFileAsBuffer } from "./cp932";

/**
 * @description エラーメッセージを表示してプロセスを終了
 * @param message - エラーメッセージ
 */
export function exitWithError(message: string): never {
	console.error(message);
	process.exit(1);
}

/**
 * @description CLI引数をパースし、最小引数数をチェック
 * @param minArgs - 必要な最小引数数
 * @param usage - 使用方法の説明
 * @returns パースされた引数配列
 */
export function parseArgs(minArgs: 1, usage: string): [string, ...string[]];
export function parseArgs(
	minArgs: 2,
	usage: string,
): [string, string, ...string[]];
export function parseArgs(
	minArgs: 3,
	usage: string,
): [string, string, string, ...string[]];
export function parseArgs(minArgs: number, usage: string): string[];
export function parseArgs(minArgs: number, usage: string): string[] {
	const args = process.argv.slice(3);
	if (args.length < minArgs) {
		exitWithError(usage);
	}
	return args;
}

/**
 * @description ファイルの存在を確認し、絶対パスを返す
 * @param filePath - 確認するファイルパス
 * @returns 絶対パス
 */
export function requireFileExists(filePath: string): string {
	const absolutePath = path.resolve(filePath);
	if (!fs.existsSync(absolutePath)) {
		exitWithError(`File not found: ${absolutePath}`);
	}
	return absolutePath;
}

/**
 * @description ファイルが存在しないことを確認し、絶対パスを返す
 * @param filePath - 確認するファイルパス
 * @param errorMessage - 存在する場合のエラーメッセージ
 * @returns 絶対パス
 */
export function requireFileNotExists(
	filePath: string,
	errorMessage?: string,
): string {
	const absolutePath = path.resolve(filePath);
	if (fs.existsSync(absolutePath)) {
		exitWithError(errorMessage ?? `File already exists: ${absolutePath}`);
	}
	return absolutePath;
}

/**
 * @description ファイルがCP932でない場合に警告を表示
 * @param buffer - 検証するバッファ
 */
export function warnIfNotCP932(buffer: Buffer): void {
	if (!isValidCP932(buffer)) {
		console.warn("Warning: File may not be valid CP932");
	}
}

/**
 * @description ファイルを読み込み、CP932検証と警告を行う
 * @param filePath - 読み込むファイルパス
 * @returns ファイル内容のBuffer
 */
export function readFileWithCP932Warning(filePath: string): Buffer {
	const buffer = readFileAsBuffer(filePath);
	warnIfNotCP932(buffer);
	return buffer;
}
