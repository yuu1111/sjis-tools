import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { encodeCP932 } from "../../src/lib/cp932";

const CLI = path.resolve("dist/cli.js");

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sjist-cli-"));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true });
});

/**
 * @description CLIコマンドを実行してstdout/stderr/exitCodeを返す
 * @param args - コマンド引数
 */
async function run(...args: string[]) {
	const proc = Bun.spawn(["node", CLI, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		cwd: tmpDir,
	});
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;
	return { stdout, stderr, exitCode };
}

describe("ヘルプ表示", () => {
	test("引数なしでusageを表示", async () => {
		const { stderr, exitCode } = await run();
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Usage: sjist <command>");
		expect(stderr).toContain("replace");
		expect(stderr).toContain("create");
	});

	test("不明なサブコマンド", async () => {
		const { stderr, exitCode } = await run("unknown");
		expect(exitCode).toBe(1);
		expect(stderr).toContain("Usage: sjist <command>");
	});
});

describe("create", () => {
	test("CP932ファイルを作成", async () => {
		const filePath = path.join(tmpDir, "new.txt");
		const { stdout, exitCode } = await run("create", filePath, "hello world");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Created CP932 file");
		expect(fs.existsSync(filePath)).toBe(true);
	});

	test("日本語テキストで作成", async () => {
		const filePath = path.join(tmpDir, "jp.txt");
		const { exitCode } = await run("create", filePath, "こんにちは");
		expect(exitCode).toBe(0);
		const buffer = fs.readFileSync(filePath);
		expect(buffer.equals(encodeCP932("こんにちは"))).toBe(true);
	});
});

describe("replace", () => {
	test("テキストを置換", async () => {
		const filePath = path.join(tmpDir, "replace.txt");
		fs.writeFileSync(filePath, encodeCP932("hello world"));

		const { stdout, exitCode } = await run(
			"replace",
			filePath,
			"hello",
			"goodbye",
		);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Replaced 1x");

		const result = fs.readFileSync(filePath);
		expect(result.equals(encodeCP932("goodbye world"))).toBe(true);
	});

	test("マッチなし", async () => {
		const filePath = path.join(tmpDir, "no-match.txt");
		fs.writeFileSync(filePath, encodeCP932("hello"));

		const { stdout, exitCode } = await run("replace", filePath, "xyz", "abc");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("No replacements made");
	});
});

describe("encoding-check", () => {
	test("有効なCP932ファイル", async () => {
		const filePath = path.join(tmpDir, "valid.txt");
		fs.writeFileSync(filePath, encodeCP932("テスト\r\n"));

		const { stdout, exitCode } = await run("encoding-check", filePath);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("passed");
	});

	test("無効なファイル", async () => {
		const filePath = path.join(tmpDir, "invalid.txt");
		fs.writeFileSync(filePath, Buffer.from("テスト", "utf8"));

		const { stderr, exitCode } = await run("encoding-check", filePath);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("failed");
	});
});

describe("encoding-repair", () => {
	test("UTF-8をCP932に変換", async () => {
		const filePath = path.join(tmpDir, "repair.txt");
		fs.writeFileSync(filePath, Buffer.from("こんにちは\n", "utf8"));

		const { stdout, exitCode } = await run("encoding-repair", filePath);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Successfully repaired");

		const result = fs.readFileSync(filePath);
		expect(result.equals(encodeCP932("こんにちは\r\n"))).toBe(true);
	});
});

describe("delete-lines", () => {
	test("指定行を削除", async () => {
		const filePath = path.join(tmpDir, "delete.txt");
		fs.writeFileSync(filePath, encodeCP932("line1\r\nline2\r\nline3"));

		const { stdout, exitCode } = await run("delete-lines", filePath, "2", "2");
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Deleted 1 lines");

		const result = fs.readFileSync(filePath);
		expect(result.equals(encodeCP932("line1\r\nline3"))).toBe(true);
	});
});

describe("extract-lines", () => {
	test("指定行を抽出", async () => {
		const filePath = path.join(tmpDir, "source.txt");
		const outPath = path.join(tmpDir, "extracted.txt");
		fs.writeFileSync(filePath, encodeCP932("line1\r\nline2\r\nline3\r\nline4"));

		const { stdout, exitCode } = await run(
			"extract-lines",
			filePath,
			outPath,
			"2-3",
		);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Successfully created");

		const result = fs.readFileSync(outPath);
		expect(result.equals(encodeCP932("line2\r\nline3"))).toBe(true);
	});
});
