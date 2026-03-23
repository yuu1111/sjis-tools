import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createCP932File, encodeCP932 } from "../../src/lib/cp932";
import {
	joinLines,
	linesToCP932Buffer,
	parseLineRanges,
	readFileAsLines,
	splitLines,
	validateLineRange,
} from "../../src/lib/lines";

describe("splitLines", () => {
	test("CRLFで分割", () => {
		expect(splitLines("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
	});

	test("LFで分割", () => {
		expect(splitLines("a\nb\nc")).toEqual(["a", "b", "c"]);
	});

	test("末尾改行ありは空文字列を含む", () => {
		expect(splitLines("a\nb\n")).toEqual(["a", "b", ""]);
	});

	test("空文字列", () => {
		expect(splitLines("")).toEqual([""]);
	});

	test("単一行", () => {
		expect(splitLines("hello")).toEqual(["hello"]);
	});
});

describe("joinLines", () => {
	test("CRLFで結合", () => {
		expect(joinLines(["a", "b", "c"])).toBe("a\r\nb\r\nc");
	});

	test("単一行", () => {
		expect(joinLines(["hello"])).toBe("hello");
	});

	test("空配列の要素", () => {
		expect(joinLines(["a", "", "c"])).toBe("a\r\n\r\nc");
	});
});

describe("splitLines / joinLines ラウンドトリップ", () => {
	test("CRLFテキスト", () => {
		const text = "a\r\nb\r\nc";
		expect(joinLines(splitLines(text))).toBe(text);
	});
});

describe("parseLineRanges", () => {
	test("単一範囲", () => {
		expect(parseLineRanges("1-10")).toEqual([[1, 10]]);
	});

	test("複数範囲", () => {
		expect(parseLineRanges("1-10,20-30")).toEqual([
			[1, 10],
			[20, 30],
		]);
	});

	test("スペースを含む", () => {
		expect(parseLineRanges(" 1-10 , 20-30 ")).toEqual([
			[1, 10],
			[20, 30],
		]);
	});

	test("不正なフォーマットでexitWithErrorを呼ぶ", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => parseLineRanges("abc-def")).toThrow("process.exit");

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});

describe("linesToCP932Buffer", () => {
	test("行配列をCP932バッファに変換", () => {
		const buffer = linesToCP932Buffer(["hello", "world"]);
		const expected = encodeCP932("hello\r\nworld");
		expect(buffer.equals(expected)).toBe(true);
	});

	test("日本語テキスト", () => {
		const buffer = linesToCP932Buffer(["こんにちは", "世界"]);
		const expected = encodeCP932("こんにちは\r\n世界");
		expect(buffer.equals(expected)).toBe(true);
	});
});

describe("validateLineRange", () => {
	test("有効な範囲は通過", () => {
		expect(() => validateLineRange(1, 5, 10)).not.toThrow();
	});

	test("単一行の範囲は有効", () => {
		expect(() => validateLineRange(3, 3, 10)).not.toThrow();
	});

	test("start < 1 でエラー", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => validateLineRange(0, 5, 10)).toThrow("process.exit");

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	test("end > totalLines でエラー", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => validateLineRange(1, 11, 10)).toThrow("process.exit");

		mockExit.mockRestore();
		mockError.mockRestore();
	});

	test("start > end でエラー", () => {
		const mockExit = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit");
		});
		const mockError = spyOn(console, "error").mockImplementation(() => {});

		expect(() => validateLineRange(5, 3, 10)).toThrow("process.exit");

		mockExit.mockRestore();
		mockError.mockRestore();
	});
});

describe("readFileAsLines", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true });
	});

	test("CP932ファイルを行配列として読み込む", () => {
		const filePath = path.join(tmpDir, "test.txt");
		createCP932File(filePath, "line1\nline2\nline3");
		const lines = readFileAsLines(filePath);
		expect(lines).toEqual(["line1", "line2", "line3"]);
	});
});
