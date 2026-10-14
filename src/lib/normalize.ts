/**
 * デコンパイル由来のノイズを正規化するユーティリティ
 */

/**
 * 組み込みの正規化ルール
 */
export interface NormalizeRule {
	/**
	 * 置換対象の正規表現 (グローバルフラグは自動付与)
	 */
	pattern: string;

	/**
	 * 置換後の文字列
	 */
	replacement: string;
}

/**
 * HSPデコンパイル出力のラベル・パラメータ番号を無害化するルール
 *
 * ラベル番号は新規追加の累積で位置によりずれるため、番号を潰して実質差分だけを残す
 */
export const HSP_RULES: NormalizeRule[] = [
	{ pattern: "\\*label_[0-9]+", replacement: "*label_N" },
	{ pattern: "prm_[0-9]+", replacement: "prm_N" },
];

/**
 * テキストに正規化ルールを適用する
 *
 * @param text - 対象テキスト
 * @param rules - 適用するルール
 * @returns 正規化後のテキスト
 */
export function normalizeText(text: string, rules: NormalizeRule[]): string {
	let result = text;
	for (const rule of rules) {
		result = result.replace(new RegExp(rule.pattern, "g"), rule.replacement);
	}
	return result;
}

/**
 * JSON文字列から正規化ルールをパースする
 *
 * @param json - ルールのJSON配列
 * @returns パースされたルール
 */
export function parseRules(json: string): NormalizeRule[] {
	const parsed: unknown = JSON.parse(json);
	if (!Array.isArray(parsed)) {
		throw new Error("Rules must be a JSON array");
	}
	return parsed.map((item) => {
		const rule = item as Partial<NormalizeRule>;
		if (typeof rule.pattern !== "string") {
			throw new Error("Each rule requires a string 'pattern'");
		}
		return {
			pattern: rule.pattern,
			replacement: typeof rule.replacement === "string" ? rule.replacement : "",
		};
	});
}
