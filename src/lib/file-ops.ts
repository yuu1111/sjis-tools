/**
 * @description ファイル操作の共通ユーティリティ(バックアップ・CP932検証)
 */

import { copyFile, removeFile } from "./cli";
import { isValidCP932, readFileAsBuffer } from "./cp932";

/**
 * @description バックアップファイルを作成する
 * @param filePath - バックアップ元のファイルパス
 * @returns バックアップファイルのパス
 */
export function createBackup(filePath: string): string {
	const backupPath = `${filePath}.bak`;
	copyFile(filePath, backupPath);
	console.log(`Backup created: ${backupPath}`);
	return backupPath;
}

/**
 * @description バックアップからファイルを復元し、バックアップを削除する
 * @param filePath - 復元先のファイルパス
 * @param backupPath - バックアップファイルのパス
 */
export function restoreFromBackup(filePath: string, backupPath: string): void {
	copyFile(backupPath, filePath);
	removeFile(backupPath);
}

/**
 * @description バックアップファイルを削除する
 * @param backupPath - 削除するバックアップファイルのパス
 */
export function removeBackup(backupPath: string): void {
	removeFile(backupPath);
}

/**
 * @description CP932検証オプション
 * @property keepOnSuccess - 検証成功時もバックアップを保持するか @default false
 * @property errorMessage - 検証失敗時のエラーメッセージ @optional
 */
interface ValidateCP932Options {
	keepOnSuccess?: boolean;
	errorMessage?: string;
}

/**
 * @description ファイルのCP932妥当性を検証し、失敗時はバックアップから復元する
 * @param filePath - 検証対象のファイルパス
 * @param backupPath - バックアップファイルのパス
 * @param options - 検証オプション
 */
export function validateCP932OrRestore(
	filePath: string,
	backupPath: string,
	options: ValidateCP932Options = {},
): void {
	if (!isValidCP932(readFileAsBuffer(filePath))) {
		const message =
			options.errorMessage ??
			"Error: Result is not valid CP932. Restoring backup...";
		console.error(message);
		restoreFromBackup(filePath, backupPath);
		process.exit(1);
	}

	if (!options.keepOnSuccess) {
		removeBackup(backupPath);
	}
}
