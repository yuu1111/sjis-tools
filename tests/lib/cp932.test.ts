import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	createCP932File,
	decodeCP932,
	detectEncoding,
	encodeCP932,
	isValidCP932,
	normalizeToCRLF,
	readFileAsBuffer,
	replaceInBuffer,
	writeBufferToFile,
} from "../../src/lib/cp932";

describe("readFileAsBuffer / writeBufferToFile", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true });
	});

	test("ファイルの読み書きラウンドトリップ", () => {
		const filePath = path.join(tmpDir, "test.bin");
		const data = Buffer.from([0x82, 0xa0, 0x82, 0xa2]); // CP932 "あい"
		writeBufferToFile(filePath, data);
		const result = readFileAsBuffer(filePath);
		expect(result.equals(data)).toBe(true);
	});
});

describe("decodeCP932 / encodeCP932", () => {
	test("ASCII文字のラウンドトリップ", () => {
		const text = "Hello, World!";
		expect(decodeCP932(encodeCP932(text))).toBe(text);
	});

	test("日本語文字のラウンドトリップ", () => {
		const text = "こんにちは世界";
		expect(decodeCP932(encodeCP932(text))).toBe(text);
	});

	test("半角カナのラウンドトリップ", () => {
		const text = "ｱｲｳｴｵ";
		expect(decodeCP932(encodeCP932(text))).toBe(text);
	});

	test("混在テキストのラウンドトリップ", () => {
		const text = "Hello こんにちは 123 ｱｲｳ";
		expect(decodeCP932(encodeCP932(text))).toBe(text);
	});
});

describe("replaceInBuffer", () => {
	test("単一置換", () => {
		const buffer = encodeCP932("aaa bbb ccc");
		const result = replaceInBuffer(buffer, "bbb", "xxx");
		expect(decodeCP932(result.buffer)).toBe("aaa xxx ccc");
		expect(result.count).toBe(1);
	});

	test("複数置換", () => {
		const buffer = encodeCP932("aaa bbb aaa");
		const result = replaceInBuffer(buffer, "aaa", "x");
		expect(decodeCP932(result.buffer)).toBe("x bbb x");
		expect(result.count).toBe(2);
	});

	test("マルチバイト文字の置換", () => {
		const buffer = encodeCP932("こんにちは世界");
		const result = replaceInBuffer(buffer, "世界", "日本");
		expect(decodeCP932(result.buffer)).toBe("こんにちは日本");
		expect(result.count).toBe(1);
	});

	test("マッチなし", () => {
		const buffer = encodeCP932("hello");
		const result = replaceInBuffer(buffer, "xyz", "abc");
		expect(decodeCP932(result.buffer)).toBe("hello");
		expect(result.count).toBe(0);
	});
});

describe("normalizeToCRLF", () => {
	test("LFをCRLFに変換", () => {
		const buffer = encodeCP932("a\nb\nc");
		const result = normalizeToCRLF(buffer);
		expect(decodeCP932(result)).toBe("a\r\nb\r\nc");
	});

	test("既存CRLFはそのまま", () => {
		const buffer = encodeCP932("a\r\nb\r\nc");
		const result = normalizeToCRLF(buffer);
		expect(decodeCP932(result)).toBe("a\r\nb\r\nc");
	});

	test("混在した改行コードを正規化", () => {
		const buffer = encodeCP932("a\nb\r\nc");
		const result = normalizeToCRLF(buffer);
		expect(decodeCP932(result)).toBe("a\r\nb\r\nc");
	});

	test("改行なしはそのまま", () => {
		const buffer = encodeCP932("hello");
		const result = normalizeToCRLF(buffer);
		expect(decodeCP932(result)).toBe("hello");
	});
});

describe("isValidCP932", () => {
	test("有効なCP932バッファ", () => {
		expect(isValidCP932(encodeCP932("こんにちは"))).toBe(true);
	});

	test("ASCII文字", () => {
		expect(isValidCP932(Buffer.from("hello"))).toBe(true);
	});

	test("無効なバイトシーケンス", () => {
		// UTF-8の3バイトシーケンス(CP932としては無効になりうる)
		const utf8Buffer = Buffer.from("テスト", "utf8");
		expect(isValidCP932(utf8Buffer)).toBe(false);
	});
});

describe("detectEncoding", () => {
	test("UTF-8 BOMを検出", () => {
		const bom = Buffer.from([0xef, 0xbb, 0xbf]);
		const content = Buffer.from("hello", "utf8");
		const buffer = Buffer.concat([bom, content]);
		expect(detectEncoding(buffer)).toBe("utf8-bom");
	});

	test("UTF-8マルチバイトを検出", () => {
		const buffer = Buffer.from("テスト", "utf8");
		expect(detectEncoding(buffer)).toBe("utf8");
	});

	test("CP932を検出", () => {
		const buffer = encodeCP932("テスト");
		expect(detectEncoding(buffer)).toBe("cp932");
	});

	test("ASCIIのみはCP932として扱う", () => {
		const buffer = Buffer.from("hello");
		expect(detectEncoding(buffer)).toBe("cp932");
	});

	test("CP932の高バイト文字(UTF-8/CP932両方で有効だがUTF-8マルチバイトなし)", () => {
		// CP932の半角カナ(0xA1-0xDF)はUTF-8としても有効なラウンドトリップにならない
		const buffer = encodeCP932("ｱｲｳ");
		expect(detectEncoding(buffer)).toBe("cp932");
	});

	test("unknownを返すケース", () => {
		// CP932でもUTF-8でもない不正なバイト列
		const buffer = Buffer.from([0xff, 0xfe, 0x80, 0x81, 0xff]);
		expect(detectEncoding(buffer)).toBe("unknown");
	});

	test("UTF-8で有効かつCP932で無効な高バイト文字", () => {
		// UTF-8のみで有効な文字(例: 絵文字のような3バイト以上)
		const buffer = Buffer.from("café", "utf8");
		expect(detectEncoding(buffer)).toBe("utf8");
	});
});

describe("createCP932File", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true });
	});

	test("CRLFで作成", () => {
		const filePath = path.join(tmpDir, "test.txt");
		createCP932File(filePath, "a\nb\nc");
		const buffer = fs.readFileSync(filePath);
		expect(decodeCP932(buffer)).toBe("a\r\nb\r\nc");
	});

	test("CRLF無効で作成", () => {
		const filePath = path.join(tmpDir, "test.txt");
		createCP932File(filePath, "a\nb\nc", false);
		const buffer = fs.readFileSync(filePath);
		expect(decodeCP932(buffer)).toBe("a\nb\nc");
	});

	test("日本語テキストで作成", () => {
		const filePath = path.join(tmpDir, "test.txt");
		createCP932File(filePath, "こんにちは\n世界");
		const buffer = fs.readFileSync(filePath);
		expect(isValidCP932(buffer)).toBe(true);
		expect(decodeCP932(buffer)).toBe("こんにちは\r\n世界");
	});
});
