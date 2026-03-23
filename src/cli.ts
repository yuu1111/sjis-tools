/**
 * @description sjist CLIエントリーポイント
 */

import { main as create } from "./cli/sjis-create";
import { main as deleteLines } from "./cli/sjis-delete-lines";
import { main as encodingCheck } from "./cli/sjis-encoding-check";
import { main as encodingRepair } from "./cli/sjis-encoding-repair";
import { main as extractLines } from "./cli/sjis-extract-lines";
import { main as replace } from "./cli/sjis-replace";

/**
 * @description サブコマンド定義
 * @property replace - SJIS/CP932ファイルのテキスト置換
 * @property create - SJIS/CP932ファイルの新規作成
 * @property delete-lines - SJIS/CP932ファイルの行範囲削除
 * @property extract-lines - SJIS/CP932ファイルから行範囲を抽出
 * @property encoding-check - SJIS/CP932エンコーディング検証
 * @property encoding-repair - エンコーディング修復(UTF-8 -> CP932)
 */
const commands: Record<
	string,
	{ handler: (() => void) | (() => Promise<void>); description: string }
> = {
	replace: {
		handler: replace,
		description: "Replace text in a SJIS/CP932 file",
	},
	create: { handler: create, description: "Create a new SJIS/CP932 file" },
	"delete-lines": {
		handler: deleteLines,
		description: "Delete line range from a SJIS/CP932 file",
	},
	"extract-lines": {
		handler: extractLines,
		description: "Extract line range to a new SJIS/CP932 file",
	},
	"encoding-check": {
		handler: encodingCheck,
		description: "Validate SJIS/CP932 encoding",
	},
	"encoding-repair": {
		handler: encodingRepair,
		description: "Repair encoding (UTF-8 -> CP932)",
	},
};

/**
 * @description 使用方法を表示
 */
function printUsage(): never {
	const lines = Object.entries(commands).map(
		([name, { description }]) => `  ${name.padEnd(17)}${description}`,
	);
	console.error(
		`Usage: sjist <command> [args...]\n\nCommands:\n${lines.join("\n")}`,
	);
	process.exit(1);
}

const command = process.argv[2];
const entry = command ? commands[command] : undefined;

if (!entry) {
	printUsage();
}

// サブコマンド名をargvから除外し、各コマンドがprocess.argv.slice(2)で引数を取得できるようにする
process.argv.splice(2, 1);

Promise.resolve(entry.handler()).catch((err) => {
	console.error(err);
	process.exit(1);
});
