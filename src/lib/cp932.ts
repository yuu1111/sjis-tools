/**
 * @description CP932 (Shift-JIS) エンコーディング処理ライブラリ
 */

import * as fs from "node:fs";
import * as iconv from "iconv-lite";

/**
 * @description CP932エンコーディング識別子
 */
const CP932 = "cp932";

/**
 * @description エンコーディングの種類
 */
export type EncodingType = "utf8-bom" | "utf8" | "cp932" | "unknown";

/**
 * @description ファイルをバイナリとして読み込む
 * @param filePath - 対象ファイルパス
 * @returns ファイル内容のBuffer
 */
export function readFileAsBuffer(filePath: string): Buffer {
	return fs.readFileSync(filePath);
}

/**
 * @description バッファをファイルに書き込む
 * @param filePath - 出力先パス
 * @param buffer - 書き込むバッファ
 */
export function writeBufferToFile(filePath: string, buffer: Buffer): void {
	fs.writeFileSync(filePath, buffer);
}

/**
 * @description CP932バッファをUTF-8文字列にデコード
 * @param buffer - CP932エンコードされたバッファ
 * @returns UTF-8文字列
 */
export function decodeCP932(buffer: Buffer): string {
	return iconv.decode(buffer, CP932);
}

/**
 * @description UTF-8文字列をCP932バッファにエンコード
 * @param text - UTF-8文字列
 * @returns CP932エンコードされたバッファ
 */
export function encodeCP932(text: string): Buffer {
	return iconv.encode(text, CP932);
}

/**
 * @description バイナリレベルでの文字列置換
 * @param buffer - 対象バッファ(CP932エンコード済み)
 * @param searchText - 検索文字列(UTF-8で指定)
 * @param replaceText - 置換文字列(UTF-8で指定)
 * @returns 置換後のバッファと置換回数
 */
export function replaceInBuffer(
	buffer: Buffer,
	searchText: string,
	replaceText: string,
): { buffer: Buffer; count: number } {
	const searchBytes = encodeCP932(searchText);
	const replaceBytes = encodeCP932(replaceText);

	const chunks: Buffer[] = [];
	let lastIndex = 0;
	let count = 0;

	for (
		let index = buffer.indexOf(searchBytes, lastIndex);
		index !== -1;
		index = buffer.indexOf(searchBytes, lastIndex)
	) {
		chunks.push(buffer.subarray(lastIndex, index));
		chunks.push(replaceBytes);
		lastIndex = index + searchBytes.length;
		count++;
	}
	chunks.push(buffer.subarray(lastIndex));

	return { buffer: Buffer.concat(chunks), count };
}

/**
 * @description 改行コードをCRLFに正規化
 * @param buffer - 正規化対象バッファ
 * @returns CRLF改行に正規化されたバッファ
 */
export function normalizeToCRLF(buffer: Buffer): Buffer {
	const out = Buffer.allocUnsafe(buffer.length * 2);
	let w = 0;
	for (let i = 0; i < buffer.length; i++) {
		const byte = buffer[i] as number;
		if (byte === 0x0a && (i === 0 || buffer[i - 1] !== 0x0d)) {
			out[w++] = 0x0d;
		}
		out[w++] = byte;
	}
	return out.subarray(0, w);
}

/**
 * @description バッファがCP932として妥当か検証
 * @param buffer - 検証対象バッファ
 * @returns CP932として妥当ならtrue
 */
export function isValidCP932(buffer: Buffer): boolean {
	try {
		const decoded = decodeCP932(buffer);
		const reencoded = encodeCP932(decoded);
		return buffer.equals(reencoded);
	} catch {
		return false;
	}
}

/**
 * @description UTF-8テキストからCP932ファイルを作成
 * @param filePath - 出力先パス
 * @param content - UTF-8文字列
 * @param useCRLF - CRLF改行を使用するか @default true
 */
export function createCP932File(
	filePath: string,
	content: string,
	useCRLF = true,
): void {
	const text = useCRLF ? content.replace(/\r?\n/g, "\r\n") : content;
	writeBufferToFile(filePath, encodeCP932(text));
}

/**
 * @description バッファにUTF-8マルチバイトシーケンスが含まれるか判定
 * @param buffer - 検査対象バッファ
 */
function hasUtf8Multibyte(buffer: Buffer): boolean {
	for (let i = 0; i < buffer.length; i++) {
		const b = buffer[i];
		if (b === undefined) continue;
		const b1 = buffer[i + 1];
		const b2 = buffer[i + 2];
		// 2バイトシーケンス: 110xxxxx 10xxxxxx
		if ((b & 0xe0) === 0xc0 && b1 !== undefined && (b1 & 0xc0) === 0x80) {
			return true;
		}
		// 3バイトシーケンス: 1110xxxx 10xxxxxx 10xxxxxx
		if (
			(b & 0xf0) === 0xe0 &&
			b1 !== undefined &&
			(b1 & 0xc0) === 0x80 &&
			b2 !== undefined &&
			(b2 & 0xc0) === 0x80
		) {
			return true;
		}
	}
	return false;
}

/**
 * @description バッファのエンコーディングを検出
 * @param buffer - 検出対象バッファ
 * @returns 検出されたエンコーディング種別
 */
export function detectEncoding(buffer: Buffer): EncodingType {
	if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
		return "utf8-bom";
	}

	try {
		const decoded = buffer.toString("utf8");
		const reencoded = Buffer.from(decoded, "utf8");
		if (buffer.equals(reencoded)) {
			if (isValidCP932(buffer)) {
				// ASCII範囲のみならCP932として扱う
				const hasHighBytes = buffer.some((b) => b > 0x7f);
				if (!hasHighBytes) {
					return "cp932";
				}
				if (hasUtf8Multibyte(buffer)) {
					return "utf8";
				}
			}
			return "utf8";
		}
	} catch {
		// UTF-8としてデコードできない
	}

	if (isValidCP932(buffer)) {
		return "cp932";
	}

	return "unknown";
}
