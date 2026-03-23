import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { encodeCP932 } from "../../src/lib/cp932";
import {
	createBackup,
	removeBackup,
	restoreFromBackup,
	validateCP932OrRestore,
} from "../../src/lib/file-ops";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-test-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true });
});

describe("createBackup", () => {
	test(".bakファイルを作成", () => {
		const filePath = path.join(tmpDir, "test.txt");
		fs.writeFileSync(filePath, "hello");

		const backupPath = createBackup(filePath);

		expect(backupPath).toBe(`${filePath}.bak`);
		expect(fs.existsSync(backupPath)).toBe(true);
		expect(fs.readFileSync(backupPath, "utf8")).toBe("hello");
	});
});

describe("removeBackup", () => {
	test("バックアップファイルを削除", () => {
		const backupPath = path.join(tmpDir, "test.txt.bak");
		fs.writeFileSync(backupPath, "backup");

		removeBackup(backupPath);

		expect(fs.existsSync(backupPath)).toBe(false);
	});
});

describe("restoreFromBackup", () => {
	test("バックアップから復元してバックアップを削除", () => {
		const filePath = path.join(tmpDir, "test.txt");
		const backupPath = path.join(tmpDir, "test.txt.bak");

		fs.writeFileSync(filePath, "modified");
		fs.writeFileSync(backupPath, "original");

		restoreFromBackup(filePath, backupPath);

		expect(fs.readFileSync(filePath, "utf8")).toBe("original");
		expect(fs.existsSync(backupPath)).toBe(false);
	});
});

describe("validateCP932OrRestore", () => {
	test("有効なCP932ファイルは通過しバックアップを削除", () => {
		const filePath = path.join(tmpDir, "valid.txt");
		const backupPath = path.join(tmpDir, "valid.txt.bak");
		const data = encodeCP932("テスト");
		fs.writeFileSync(filePath, data);
		fs.writeFileSync(backupPath, data);

		validateCP932OrRestore(filePath, backupPath);

		expect(fs.existsSync(filePath)).toBe(true);
		expect(fs.existsSync(backupPath)).toBe(false);
	});

	test("keepOnSuccess: trueでバックアップを保持", () => {
		const filePath = path.join(tmpDir, "valid.txt");
		const backupPath = path.join(tmpDir, "valid.txt.bak");
		const data = encodeCP932("テスト");
		fs.writeFileSync(filePath, data);
		fs.writeFileSync(backupPath, data);

		validateCP932OrRestore(filePath, backupPath, { keepOnSuccess: true });

		expect(fs.existsSync(backupPath)).toBe(true);
	});

	test("無効なファイルはバックアップから復元してexit", () => {
		const filePath = path.join(tmpDir, "invalid.txt");
		const backupPath = path.join(tmpDir, "invalid.txt.bak");
		const original = encodeCP932("オリジナル");
		fs.writeFileSync(filePath, Buffer.from("テスト", "utf8"));
		fs.writeFileSync(backupPath, original);

		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => validateCP932OrRestore(filePath, backupPath)).toThrow(
			"process.exit",
		);

		expect(fs.readFileSync(filePath).equals(original)).toBe(true);
		expect(fs.existsSync(backupPath)).toBe(false);

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	test("カスタムエラーメッセージ", () => {
		const filePath = path.join(tmpDir, "invalid.txt");
		const backupPath = path.join(tmpDir, "invalid.txt.bak");
		fs.writeFileSync(filePath, Buffer.from("テスト", "utf8"));
		fs.writeFileSync(backupPath, encodeCP932("OK"));

		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() =>
			validateCP932OrRestore(filePath, backupPath, {
				errorMessage: "Custom error",
			}),
		).toThrow("process.exit");

		expect(mockError).toHaveBeenCalledWith("Custom error");

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});
