// Regression test for the proto_parse_cli binary.
// Runs the CLI against every wav in testdata/ and compares the
// decoded JSON to the matching reference json. Field-level diff.
//
// Usage: npx tsx server/audio-parser/verify.ts

import { spawnSync } from "child_process";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { fileURLToPath } from "url";

const DIR = dirname(fileURLToPath(import.meta.url));
const TESTDATA = join(DIR, "testdata");
const CLI = join(DIR, "proto_parse_cli");

if (!existsSync(CLI)) {
  console.error(`CLI binary not found: ${CLI}\nRun: bash ${join(DIR, "build.sh")}`);
  process.exit(1);
}

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return false;
      // @ts-expect-error index
      if (!deepEq(a[ka[i]], b[kb[i]])) return false;
    }
    return true;
  }
  return false;
}

function diff(actual: any, expected: any, path = ""): string[] {
  const out: string[] = [];
  if (typeof actual !== "object" || typeof expected !== "object" || actual === null || expected === null) {
    if (!deepEq(actual, expected)) out.push(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return out;
  }
  const seen: Record<string, true> = {};
  for (const k of Object.keys(actual)) seen[k] = true;
  for (const k of Object.keys(expected)) seen[k] = true;
  for (const k of Object.keys(seen)) {
    if (!(k in actual)) out.push(`${path}.${k}: missing in actual`);
    else if (!(k in expected)) out.push(`${path}.${k}: unexpected key in actual`);
    else out.push(...diff(actual[k], expected[k], path + "." + k));
  }
  return out;
}

const wavs = readdirSync(TESTDATA).filter((f) => f.toLowerCase().endsWith(".wav"));
const jsons = readdirSync(TESTDATA).filter((f) => f.toLowerCase().endsWith(".json"));

let pass = 0;
let fail = 0;
const missing: string[] = [];

for (const j of jsons) {
  const stem = basename(j, extname(j));
  const wav = stem + ".wav";
  if (!wavs.includes(wav)) {
    missing.push(wav);
  }
}

for (const wav of wavs) {
  const stem = basename(wav, extname(wav));
  const jsonPath = join(TESTDATA, stem + ".json");
  if (!existsSync(jsonPath)) {
    console.warn(`SKIP ${wav}: no reference json`);
    continue;
  }
  const proc = spawnSync(CLI, [join(TESTDATA, wav)], { encoding: "utf8" });
  if (proc.status !== 0) {
    console.error(`FAIL ${wav}: cli exit ${proc.status}\n${proc.stderr}`);
    fail++;
    continue;
  }
  let actual: any;
  try {
    actual = JSON.parse(proc.stdout);
  } catch (e) {
    console.error(`FAIL ${wav}: invalid JSON\n${proc.stdout}`);
    fail++;
    continue;
  }
  const expected = JSON.parse(readFileSync(jsonPath, "utf8"));
  const diffs = diff(actual, expected);
  if (diffs.length === 0) {
    console.log(`PASS ${wav}`);
    pass++;
  } else {
    console.error(`FAIL ${wav}:`);
    for (const d of diffs) console.error("  " + d);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (missing.length) {
  console.warn(`Missing wav samples (json present, wav absent): ${missing.join(", ")}`);
}
process.exit(fail === 0 ? 0 : 1);
