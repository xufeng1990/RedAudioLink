import { ProtocolEvent, LowBatteryEvent } from "../types";
import { API_BASE, tokenStore } from "../api/client";
import * as FileSystem from "expo-file-system/legacy";

export interface WavHeaderInfo {
  isWav: boolean;
  riff: string;
  wave: string;
  fmtChunk: string;
  audioFormat: number; // 1 = PCM
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  fileSize: number;
  rawHex: string;
}

// 已知的录音格式（与原生 iOS Linear PCM 配置一致）
const PCM_SAMPLE_RATE = 44100;
const PCM_CHANNELS = 2;
const PCM_BITS_PER_SAMPLE = 16;

export function base64ToBytes(b64: string): Uint8Array {
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(binary, "binary").toString("base64");
}

export function buildWavHeader(pcmByteLength: number): Uint8Array {
  const byteRate = (PCM_SAMPLE_RATE * PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;
  const blockAlign = (PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;
  const header = new Uint8Array(44);
  const dv = new DataView(header.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) header[off + i] = s.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  dv.setUint32(4, 36 + pcmByteLength, true); // 文件总长 - 8
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  dv.setUint32(16, 16, true); // PCM fmt chunk size
  dv.setUint16(20, 1, true); // audioFormat = 1 (PCM)
  dv.setUint16(22, PCM_CHANNELS, true);
  dv.setUint32(24, PCM_SAMPLE_RATE, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, PCM_BITS_PER_SAMPLE, true);
  writeStr(36, "data");
  dv.setUint32(40, pcmByteLength, true);
  return header;
}

/**
 * 读取正在录制（或已停止）的 iOS WAV 文件，
 * 提取真实 PCM 样本，重建一个完全合法的 PCM WAV 写到缓存目录，返回新文件 URI。
 *
 * 处理 iOS 在录制中只写了 RIFF + JUNK 占位的情况：
 *   - 如果能找到 'data' chunk → 用其后所有字节作为 PCM
 *   - 如果只找到 JUNK 还没写 fmt/data → 直接用 JUNK 之后的所有字节作为 PCM
 *   - 文件太小（无音频数据）→ 返回 null
 */
export async function buildPcmSnapshot(srcUri: string): Promise<string | null> {
  try {
    const info: any = await FileSystem.getInfoAsync(srcUri, {
      size: true,
    } as any);
    if (!info.exists || !info.size || info.size < 100) return null;

    const b64 = await FileSystem.readAsStringAsync(srcUri, {
      encoding: "base64" as any,
    } as any);
    const bytes = base64ToBytes(b64);
    if (bytes.length < 12) return null;

    const ascii = (start: number, len: number) =>
      String.fromCharCode(...bytes.subarray(start, start + len));
    const dv = new DataView(bytes.buffer);

    let pcmStart = -1;
    let pcmEnd = bytes.length;

    if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") {
      let cur = 12;
      let lastJunkEnd = -1;
      let foundData = false;
      while (cur + 8 <= bytes.length) {
        const id = ascii(cur, 4);
        const size = dv.getUint32(cur + 4, true);
        if (id === "data") {
          pcmStart = cur + 8;
          if (size > 0 && cur + 8 + size <= bytes.length) {
            pcmEnd = cur + 8 + size;
          }
          foundData = true;
          break;
        }
        if (id === "JUNK" || id === "FLLR" || id === "PAD ") {
          // 只在 chunk 头有效时记录其尾部位置
          if (size > 0 && size < bytes.length) {
            lastJunkEnd = cur + 8 + size + (size & 1);
          }
        }
        if (size === 0 || cur + 8 + size > bytes.length) {
          // chunk size 还没写好（iOS 录制中常见）→ 退化用 JUNK 之后的字节
          break;
        }
        cur += 8 + size + (size & 1);
      }
      if (!foundData && lastJunkEnd > 0 && lastJunkEnd < bytes.length) {
        pcmStart = lastJunkEnd;
      }
    }

    if (pcmStart < 0) {
      // 没有任何可识别 chunk → 假设按 iOS 经典布局：RIFF(12)+JUNK(36)+fmt(24)+data hdr(8)=80
      const FALLBACK = 80;
      if (bytes.length > FALLBACK + 1024) {
        pcmStart = FALLBACK;
      } else {
        return null;
      }
    }

    const pcm = bytes.subarray(pcmStart, pcmEnd);
    if (pcm.length < 1024) return null; // 不到 ~6ms 的双声道 16bit 数据，没意义

    const header = buildWavHeader(pcm.length);
    const out = new Uint8Array(header.length + pcm.length);
    out.set(header, 0);
    out.set(pcm, header.length);

    const dir = (FileSystem.cacheDirectory as string) || "";
    const dstUri = `${dir}snapshot-${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(dstUri, bytesToBase64(out), {
      encoding: "base64" as any,
    } as any);
    return dstUri;
  } catch (e: any) {
    console.log("[snapshot] build error:", e?.message);
    return null;
  }
}

export async function inspectWavHeader(
  uri: string,
): Promise<WavHeaderInfo | null> {
  try {
    // 读前 512 字节足够覆盖 RIFF + 任意先导 JUNK/bext 块 + fmt 块
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64" as any,
      length: 512,
      position: 0,
    } as any);
    const binary =
      typeof atob === "function"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    if (bytes.length < 12) {
      console.log("[WAV header] file too small:", bytes.length);
      return null;
    }
    const dv = new DataView(bytes.buffer);
    const ascii = (start: number, len: number) =>
      String.fromCharCode(...bytes.subarray(start, start + len));

    // 遍历 chunk 找到 "fmt " 块（iOS 在录音过程中会先写一个 JUNK 占位块）
    let fmtOffset = -1;
    let cur = 12;
    while (cur + 8 <= bytes.length) {
      const id = ascii(cur, 4);
      const size = dv.getUint32(cur + 4, true);
      if (id === "fmt ") {
        fmtOffset = cur;
        break;
      }
      // chunk size 不合理（例如未写完是全 0）就停止
      if (size === 0 || size > bytes.length) break;
      cur += 8 + size + (size & 1); // RIFF 块需对齐到偶数
    }

    const info: WavHeaderInfo = {
      isWav: false,
      riff: ascii(0, 4),
      wave: ascii(8, 4),
      fmtChunk: fmtOffset >= 0 ? "fmt " : ascii(12, 4),
      fileSize: dv.getUint32(4, true) + 8,
      audioFormat: 0,
      numChannels: 0,
      sampleRate: 0,
      byteRate: 0,
      blockAlign: 0,
      bitsPerSample: 0,
      rawHex: Array.from(bytes.slice(0, 64))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    };
    if (fmtOffset >= 0 && fmtOffset + 24 <= bytes.length) {
      const f = fmtOffset + 8;
      info.audioFormat = dv.getUint16(f + 0, true);
      info.numChannels = dv.getUint16(f + 2, true);
      info.sampleRate = dv.getUint32(f + 4, true);
      info.byteRate = dv.getUint32(f + 8, true);
      info.blockAlign = dv.getUint16(f + 12, true);
      info.bitsPerSample = dv.getUint16(f + 14, true);
    }
    info.isWav =
      info.riff === "RIFF" &&
      info.wave === "WAVE" &&
      info.fmtChunk === "fmt " &&
      info.audioFormat === 1; // PCM
    return info;
  } catch (e: any) {
    console.log("[WAV header] read error:", e?.message);
    return null;
  }
}

export interface ParsedDeviceData {
  model_no: string;
  sn: string;
  date: string;
  duration: number;
  sensor_status: 0 | 1;
  battery_level: 0 | 1 | 2 | 3 | 4;
  battery: number;
  dust_level: 0 | 1 | 2 | 3;
  main_power_status?: 0 | 1;
  main_power_events?: ProtocolEvent;
  wrong_wiring_events?: ProtocolEvent;
  wire_interconnect_events?: ProtocolEvent;
  interconnect_events?: ProtocolEvent;
  low_battery_events?: LowBatteryEvent;
  test_button_pressed?: ProtocolEvent;
  times_alarm_deactivated?: ProtocolEvent;
  smoke_alarm?: ProtocolEvent;
}

export interface AudioParseResponse {
  ok: boolean;
  data?: ParsedDeviceData;
  error?: string;
  status?: number;
}

export async function uploadAudioChunk(
  blob: Blob | { uri: string; type?: string; name?: string },
  filename = "recording.wav",
): Promise<AudioParseResponse> {
  await tokenStore.ready();
  const fd = new FormData();
  if ((blob as any).uri) {
    fd.append("file", blob as any);
  } else {
    fd.append("file", blob as Blob, filename);
  }
  const headers: Record<string, string> = {};
  const tok = tokenStore.get();
  if (tok) headers.Authorization = `Bearer ${tok}`;

  const res = await fetch(`https://red.nuoyicloud.com/audio/parse`, {
    method: "POST",
    headers,
    body: fd,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "invalid server response", status: res.status };
  }
  // console.log("解析结果：", json.data);
  if (json && json.data && json.data.data && json.data.data.model_no) {
    console.log("解析到正确结果:", json.data.data);
    return { ok: true, data: json.data.data as ParsedDeviceData };
  } else {
    return {
      ok: false,
      error: json?.error || `HTTP ${res.status}`,
      status: res.status,
    };
  }
}
