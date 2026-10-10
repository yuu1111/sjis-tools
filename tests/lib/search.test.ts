import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createCP932File } from "../../src/lib/cp932";
import { HSP_RULES, normalizeText, parseRules } from "../../src/lib/normalize";
import {
	decodeFileForSearch,
	globToRegExp,
	searchFiles,
} from "../../src/lib/search";

describe("globToRegExp", () => {
	test("* はパス区切り以外にマッチする", () => {
		expect(globToRegExp("*.hsp").test("a.hsp")).toBe(true);
		expect(globToRegExp("*.hsp").test("a.txt")).toBe(false);
	});
	test("? は1文字にマッチする", () => {
		expect(globToRegExp("a?.hsp").test("ab.hsp")).toBe(true);
		expect(globToRegExp("a?.hsp").test("abc.hsp")).toBe(false);
	});
});

describe("normalizeText", () => {
	test("HSPルールでラベルとパラメータ番号を潰す", () => {
		const input = "gosub *label_1234\nprm_567 = 1";
		expect(normalizeText(input, HSP_RULES)).toBe("gosub *label_N\nprm_N = 1");
	});
	test("ルールが空ならそのまま", () => {
		expect(normalizeText("*label_1", [])).toBe("*label_1");
	});
});

describe("parseRules", () => {
	test("JSON配列をパースする", () => {
		expect(parseRules('[{"pattern":"a","replacement":"b"}]')).toEqual([
			{ pattern: "a", replacement: "b" },
		]);
	});
	test("replacement 省略時は空文字", () => {
		expect(parseRules('[{"pattern":"a"}]')).toEqual([
			{ pattern: "a", replacement: "" },
		]);
	});
	test("配列以外は例外", () => {
		expect(() => parseRules("{}")).toThrow();
	});
});

describe("searchFiles / decodeFileForSearch", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-search-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true });
	});

	test("CP932ファイル内の日本語を検索できる", () => {
		const file = path.join(tmpDir, "a.hsp");
		createCP932File(file, 's = "邪悪な"\nother\n');
		const matches = searchFiles({ pattern: "邪悪", paths: [tmpDir] });
		expect(matches).toHaveLength(1);
		expect(matches[0]?.lineNumber).toBe(1);
	});

	test("include でファイル名を絞り込む", () => {
		createCP932File(path.join(tmpDir, "a.hsp"), "target\n");
		createCP932File(path.join(tmpDir, "b.txt"), "target\n");
		const matches = searchFiles({
			pattern: "target",
			paths: [tmpDir],
			include: "*.hsp",
		});
		expect(matches).toHaveLength(1);
		expect(matches[0]?.path.endsWith("a.hsp")).toBe(true);
	});

	test("exclude で除外できる", () => {
		createCP932File(path.join(tmpDir, "a.hsp"), "target\n");
		createCP932File(path.join(tmpDir, "b.hsp"), "target\n");
		const matches = searchFiles({
			pattern: "target",
			paths: [tmpDir],
			exclude: "b.hsp",
		});
		expect(matches).toHaveLength(1);
	});

	test("正規表現と大文字小文字無視", () => {
		createCP932File(path.join(tmpDir, "a.hsp"), "Gettrait(C, 132)\n");
		const matches = searchFiles({
			pattern: "gettrait\\(c, 132\\)",
			paths: [tmpDir],
			regex: true,
			ignoreCase: true,
		});
		expect(matches).toHaveLength(1);
	});

	test("limit で打ち切る", () => {
		createCP932File(path.join(tmpDir, "a.hsp"), "x\nx\nx\n");
		expect(
			searchFiles({ pattern: "x", paths: [tmpDir], limit: 2 }),
		).toHaveLength(2);
	});

	test("UTF-8ファイルも検索できる", () => {
		fs.writeFileSync(path.join(tmpDir, "u.hsp"), "hello 邪悪\n", "utf8");
		expect(searchFiles({ pattern: "邪悪", paths: [tmpDir] })).toHaveLength(1);
	});

	test("decodeFileForSearch はバイナリでnullを返す", () => {
		const file = path.join(tmpDir, "bin");
		fs.writeFileSync(file, Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]));
		expect(decodeFileForSearch(file)).toBeNull();
	});
});
