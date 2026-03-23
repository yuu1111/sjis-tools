/**
 * @description esbuildでCLIをバンドルし、出力を2行(shebang + コード)に圧縮する
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { buildSync } from "esbuild";

const outfile = "dist/cli.js";

rmSync("dist", { recursive: true, force: true });

buildSync({
	entryPoints: ["src/cli.ts"],
	bundle: true,
	platform: "node",
	format: "esm",
	minify: true,
	external: ["iconv-lite"],
	outfile,
	banner: { js: "#!/usr/bin/env node" },
});

/**
 * @description テンプレートリテラル内の改行を\nに、それ以外の改行を除去する
 * @param code - 処理対象のコード文字列
 * @returns 1行に圧縮されたコード
 */
function flattenToOneLine(code: string): string {
	let result = "";
	let inTemplate = false;

	for (let i = 0; i < code.length; i++) {
		const ch = code[i];

		if (ch === "`" && code[i - 1] !== "\\") {
			inTemplate = !inTemplate;
			result += ch;
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && code[i + 1] === "\n") i++;
			if (inTemplate) {
				result += "\\n";
			}
		} else {
			result += ch;
		}
	}

	return result;
}

const src = readFileSync(outfile, "utf8");
const newline = src.indexOf("\n");
const shebang = src.slice(0, newline);
const code = flattenToOneLine(src.slice(newline + 1));
writeFileSync(outfile, `${shebang}\n${code}\n`);
