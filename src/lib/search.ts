/**
 * CP932/UTF-8対応のファイル検索ユーティリティ
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { decodeCP932, detectEncoding } from "./cp932";

/**
 * 検索オプション
 */
export interface SearchOptions {
	/**
	 * 検索パターン
	 */
	pattern: string;

	/**
	 * 検索対象のファイルまたはディレクトリ
	 */
	paths: string[];

	/**
	 * 対象ファイル名のglobパターン (例: "*.hsp")
	 */
	include?: string | undefined;

	/**
	 * 除外するファイル名のglobパターン
	 */
	exclude?: string | undefined;

	/**
	 * 大文字小文字を無視するか
	 */
	ignoreCase?: boolean;

	/**
	 * 正規表現として扱うか
	 */
	regex?: boolean;

	/**
	 * 最大ヒット数 (0は無制限)
	 */
	limit?: number;
}

/**
 * 検索結果の1件
 */
export interface SearchMatch {
	/**
	 * ファイルパス
	 */
	path: string;

	/**
	 * 1始まりの行番号
	 */
	lineNumber: number;

	/**
	 * 行の内容 (改行なし)
	 */
	line: string;
}

/**
 * globパターンを正規表現に変換する
 *
 * @param pattern - globパターン
 * @returns 正規表現
 */
export function globToRegExp(pattern: string): RegExp {
	let source = "";
	for (let i = 0; i < pattern.length; i++) {
		const ch = pattern[i];
		if (ch === "*") {
			if (pattern[i + 1] === "*") {
				source += ".*";
				i++;
			} else {
				source += "[^/\\\\]*";
			}
		} else if (ch === "?") {
			source += "[^/\\\\]";
		} else if (ch && ".+^$()[]{}|\\".includes(ch)) {
			source += `\\${ch}`;
		} else {
			source += ch ?? "";
		}
	}
	return new RegExp(`^${source}$`);
}

/**
 * パスを再帰的に列挙する
 *
 * @param target - ファイルまたはディレクトリ
 * @returns ファイルパスの配列
 */
function listFiles(target: string): string[] {
	const stat = fs.statSync(target);
	if (stat.isFile()) {
		return [target];
	}
	const result: string[] = [];
	for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
		if (entry.name === ".git" || entry.name === "node_modules") {
			continue;
		}
		result.push(...listFiles(path.join(target, entry.name)));
	}
	return result;
}

/**
 * ファイルを検索可能なテキストにデコードする
 *
 * @param filePath - 対象ファイルパス
 * @returns デコード済みテキスト、またはnull
 */
export function decodeFileForSearch(filePath: string): string | null {
	const buffer = fs.readFileSync(filePath);
	if (buffer.length === 0) {
		return "";
	}
	const encoding = detectEncoding(buffer);
	if (encoding === "utf8" || encoding === "utf8-bom") {
		return buffer.toString("utf8").replace(/^\uFEFF/, "");
	}
	if (encoding === "cp932") {
		return decodeCP932(buffer);
	}
	return null;
}

/**
 * 行のマッチャ
 */
interface LineMatcher {
	/**
	 * 行がマッチするか判定する
	 *
	 * @param line - 対象行
	 */
	test(line: string): boolean;
}

/**
 * 検索パターンから行マッチャを生成する
 *
 * @param options - 検索オプション
 * @returns 行マッチャ
 */
function createMatcher(options: SearchOptions): LineMatcher {
	if (options.regex) {
		const matcher = new RegExp(options.pattern, options.ignoreCase ? "i" : "");
		return { test: (line) => matcher.test(line) };
	}
	const needle = options.ignoreCase
		? options.pattern.toLowerCase()
		: options.pattern;
	return {
		test: (line) =>
			(options.ignoreCase ? line.toLowerCase() : line).includes(needle),
	};
}

/**
 * ファイル名が検索対象か判定する
 *
 * @param file - 対象ファイルパス
 * @param includeRe - 対象パターン
 * @param excludeRe - 除外パターン
 * @returns 検索対象ならtrue
 */
function isTargetFile(
	file: string,
	includeRe: RegExp | undefined,
	excludeRe: RegExp | undefined,
): boolean {
	const base = path.basename(file);
	if (includeRe && !includeRe.test(base)) {
		return false;
	}
	return !excludeRe?.test(base);
}

/**
 * 1ファイルを検索して結果に追加する
 *
 * @param file - 対象ファイルパス
 * @param matcher - 行マッチャ
 * @param limit - 最大ヒット数 (0は無制限)
 * @param matches - 結果の追加先
 * @returns 上限に達したらtrue
 */
function searchInFile(
	file: string,
	matcher: LineMatcher,
	limit: number,
	matches: SearchMatch[],
): boolean {
	const text = decodeFileForSearch(file);
	if (text === null) {
		return false;
	}
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		if (!matcher.test(line)) {
			continue;
		}
		matches.push({ path: file, lineNumber: i + 1, line });
		if (limit && matches.length >= limit) {
			return true;
		}
	}
	return false;
}

/**
 * 複数ファイルを検索する
 *
 * @param options - 検索オプション
 * @returns ヒットした行の配列
 */
export function searchFiles(options: SearchOptions): SearchMatch[] {
	const includeRe = options.include ? globToRegExp(options.include) : undefined;
	const excludeRe = options.exclude ? globToRegExp(options.exclude) : undefined;
	const matcher = createMatcher(options);
	const limit = options.limit ?? 0;

	const files = options.paths
		.flatMap((p) => listFiles(p))
		.sort((a, b) => a.localeCompare(b));

	const matches: SearchMatch[] = [];
	for (const file of files) {
		if (!isTargetFile(file, includeRe, excludeRe)) {
			continue;
		}
		if (searchInFile(file, matcher, limit, matches)) {
			break;
		}
	}
	return matches;
}
