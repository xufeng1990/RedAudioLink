// Backend integration for the proto_parse_cli binary.
// Builds the binary on demand and exposes parseWav() which spawns
// the CLI against a temporary file and returns the parsed JSON.

import { spawn, spawnSync } from "child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Resolve this file's directory in a way that works in both ESM (dev/tsx)
// and CJS (production esbuild bundle). In CJS `import.meta.url` is undefined,
// so fall back to the source location relative to cwd.
let DIR: string;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- import.meta is defined in ESM only
  DIR = dirname(fileURLToPath(import.meta.url));
} catch {
  DIR = resolve(process.cwd(), "server/audio-parser");
}
const CLI = join(DIR, "proto_parse_cli");
const BUILD_SH = join(DIR, "build.sh");

export const AUDIO_PARSER_DIR = DIR;
export const AUDIO_PARSER_CLI = CLI;

let buildPromise: Promise<void> | null = null;

export function ensureCliBuilt(): Promise<void> {
  if (existsSync(CLI)) return Promise.resolve();
  if (buildPromise) return buildPromise;
  buildPromise = new Promise((resolve, reject) => {
    const proc = spawn("bash", [BUILD_SH], { cwd: DIR });
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code === 0 && existsSync(CLI)) resolve();
      else reject(new Error(`build.sh exit ${code}: ${err}`));
    });
    proc.on("error", reject);
  });
  return buildPromise;
}

export interface ParsedDeviceData {
  model_no: string;
  SN: string;
  date: string;
  duration: number;
  sensor_status: number;
  battery_level: number;
  battery: number;
  dust_level: number;
  main_power_status?: number;
  main_power_events?: { times: number; last_time: number };
  Wrong_Wiring_events?: { times: number; last_time: number };
  Wire_Interconnect_events?: { times: number; last_time: number };
  Interconnect_events?: { times: number; last_time: number };
  low_battery_events?: { warning_beeps: number; last_beep: number };
  test_button_pressed?: { times: number; last_time: number };
  times_alarm_deactivated?: { times: number; last_time: number };
  smoke_alarm?: { times: number; last_time: number };
}

export interface ParseResult {
  ok: boolean;
  data?: ParsedDeviceData;
  error?: string;
}

export async function parseWav(wavBuffer: Buffer): Promise<ParseResult> {
  await ensureCliBuilt();
  // Reject obviously non-WAV uploads early to keep noise out of the CLI logs.
  if (wavBuffer.length < 44 || wavBuffer.slice(0, 4).toString() !== "RIFF") {
    return { ok: false, error: "uploaded file is not a RIFF/WAV" };
  }
  const dir = mkdtempSync(join(tmpdir(), "audio-"));
  const path = join(dir, "in.wav");
  try {
    writeFileSync(path, wavBuffer);
    const result = spawnSync(CLI, [path], { encoding: "utf8", timeout: 20_000 });
    if (result.status !== 0) {
      return {
        ok: false,
        error: (result.stderr || "").trim() || `cli exit ${result.status}`,
      };
    }
    let data: ParsedDeviceData;
    try {
      data = JSON.parse(result.stdout);
    } catch (e) {
      return { ok: false, error: "cli returned invalid JSON" };
    }
    if (!data.model_no) {
      return { ok: false, error: "no model_no in parsed data" };
    }
    return { ok: true, data };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
