import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	exitWithError,
	parseArgs,
	readFileWithCP932Warning,
	requireFileExists,
	requireFileNotExists,
	warnIfNotCP932,
} from "../../src/lib/cli";
import { encodeCP932 } from "../../src/lib/cp932";

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-test-"));
});

afterEach(() => {
	tmpDir && fs.rmSync(tmpDir, { recursive: true });
});

describe("exitWithError", () => {
	test("stderrに出力してprocess.exitを呼ぶ", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => exitWithError("test error")).toThrow("process.exit");
		expect(mockError).toHaveBeenCalledWith("test error");
		expect(mockExit).toHaveBeenCalledWith(1);

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});

describe("parseArgs", () => {
	test("十分な引数がある場合は配列を返す", () => {
		const original = process.argv;
		process.argv = ["node", "cli.js", "arg1", "arg2", "arg3"];
		const result = parseArgs(2, "usage");
		expect(result).toEqual(["arg1", "arg2", "arg3"]);
		process.argv = original;
	});

	test("引数が足りない場合はexitWithErrorを呼ぶ", () => {
		const original = process.argv;
		process.argv = ["node", "cli.js"];
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => parseArgs(2, "Usage: test")).toThrow("process.exit");
		expect(mockError).toHaveBeenCalledWith("Usage: test");

		mockExit.mockRestore();
		mockError.mockRestore();
		process.argv = original;
	});
});

describe("requireFileExists", () => {
	test("ファイルが存在する場合は絶対パスを返す", () => {
		const filePath = path.join(tmpDir, "exists.txt");
		fs.writeFileSync(filePath, "test");
		const result = requireFileExists(filePath);
		expect(result).toBe(path.resolve(filePath));
	});

	test("ファイルが存在しない場合はexitWithErrorを呼ぶ", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => requireFileExists("/nonexistent/file.txt")).toThrow(
			"process.exit",
		);

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});

describe("requireFileNotExists", () => {
	test("ファイルが存在しない場合は絶対パスを返す", () => {
		const filePath = path.join(tmpDir, "new.txt");
		const result = requireFileNotExists(filePath);
		expect(result).toBe(path.resolve(filePath));
	});

	test("ファイルが存在する場合はexitWithErrorを呼ぶ", () => {
		const filePath = path.join(tmpDir, "exists.txt");
		fs.writeFileSync(filePath, "test");

		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => requireFileNotExists(filePath)).toThrow("process.exit");

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	test("カスタムエラーメッセージ", () => {
		const filePath = path.join(tmpDir, "exists.txt");
		fs.writeFileSync(filePath, "test");

		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => requireFileNotExists(filePath, "custom msg")).toThrow(
			"process.exit",
		);
		expect(mockError).toHaveBeenCalledWith("custom msg");

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});

describe("warnIfNotCP932", () => {
	test("有効なCP932では警告しない", () => {
		const mockWarn = spyOn(console, "warn").mockImplementation(() => {});
		warnIfNotCP932(encodeCP932("テスト"));
		expect(mockWarn).not.toHaveBeenCalled();
		mockWarn.mockRestore();
	});

	test("無効なCP932で警告を出す", () => {
		const mockWarn = spyOn(console, "warn").mockImplementation(() => {});
		warnIfNotCP932(Buffer.from("テスト", "utf8"));
		expect(mockWarn).toHaveBeenCalledWith(
			"Warning: File may not be valid CP932",
		);
		mockWarn.mockRestore();
	});
});

describe("readFileWithCP932Warning", () => {
	test("ファイルを読み込んでバッファを返す", () => {
		const filePath = path.join(tmpDir, "test.txt");
		const data = encodeCP932("テスト");
		fs.writeFileSync(filePath, data);

		const mockWarn = spyOn(console, "warn").mockImplementation(() => {});
		const result = readFileWithCP932Warning(filePath);
		expect(result.equals(data)).toBe(true);
		expect(mockWarn).not.toHaveBeenCalled();
		mockWarn.mockRestore();
	});

	test("無効なCP932ファイルで警告", () => {
		const filePath = path.join(tmpDir, "utf8.txt");
		fs.writeFileSync(filePath, Buffer.from("テスト", "utf8"));

		const mockWarn = spyOn(console, "warn").mockImplementation(() => {});
		readFileWithCP932Warning(filePath);
		expect(mockWarn).toHaveBeenCalled();
		mockWarn.mockRestore();
	});
});
