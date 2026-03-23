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
 */
const commands: Record<string, (() => void) | (() => Promise<void>)> = {
	replace,
	create,
	"delete-lines": deleteLines,
	"extract-lines": extractLines,
	"encoding-check": encodingCheck,
	"encoding-repair": encodingRepair,
};

/**
 * @description 使用方法を表示
 */
function printUsage(): void {
	console.error(`Usage: sjist <command> [args...]

Commands:
  replace          Replace text in a SJIS/CP932 file
  create           Create a new SJIS/CP932 file
  delete-lines     Delete line range from a SJIS/CP932 file
  extract-lines    Extract line range to a new SJIS/CP932 file
  encoding-check   Validate SJIS/CP932 encoding
  encoding-repair  Repair encoding (UTF-8 -> CP932)`);
	process.exit(1);
}

const command = process.argv[2];

const handler = command ? commands[command] : undefined;

if (!handler) {
	printUsage();
} else {
	Promise.resolve(handler()).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
