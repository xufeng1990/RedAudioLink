import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
  Alert,
  Linking,
  PermissionsAndroid,
  NativeModules,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Asset } from "expo-asset";
import { Colors } from "../theme/colors";
import {
  ParsedDeviceData,
  uploadAudioChunk,
  buildPcmSnapshot,
  buildWavHeader,
  base64ToBytes,
  bytesToBase64,
} from "../utils/audioParser";
import {
  AudioModule,
  useAudioRecorder,
  IOSOutputFormat,
  AudioQuality,
  setAudioModeAsync,
} from "expo-audio";
import type { AudioRecorder } from "expo-audio";
import type { AndroidOutputFormat, AndroidAudioEncoder } from "expo-audio";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

// Android：expo-audio 走 MediaRecorder，根本不支持原始 PCM/WAV，
// 只能录 AAC 等压缩格式（音质差、文件小）。
// 这里用 react-native-audio-record 拿到 16-bit raw PCM 流，
// 再用我们自己的 buildWavHeader 拼成完全合法的 WAV 上传给 FFT 服务。
//
// ⚠️ 必须先检查 NativeModules.RNAudioRecord，因为如果原生模块没有链接，
// require().default 返回的是包装对象（非 null），但内部调用 RNAudioRecord.init()
// 时会抛出 "Cannot read property 'init' of null"。
let AndroidAudioRecord: any = null;
if (Platform.OS === "android") {
  try {
    if (NativeModules.RNAudioRecord) {
      AndroidAudioRecord = require("react-native-audio-record").default;
      console.log("[AndroidAudioRecord] native module linked OK");
    } else {
      console.warn(
        "[AndroidAudioRecord] NativeModules.RNAudioRecord is null — module not linked in this build",
      );
    }
  } catch (err) {
    console.warn("[AndroidAudioRecord] require failed:", (err as any)?.message);
  }
}

// 录音格式与原生 iOS Linear PCM 配置严格对齐：
//   mFormatID            = kAudioFormatLinearPCM
//   mSampleRate          = 44100
//   mChannelsPerFrame    = 2
//   mBitsPerChannel      = 16
//   mFormatFlags         = kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked
//   mBytesPerPacket      = 2 * 2 = 4
//   mBytesPerFrame       = 4
//   mFramesPerPacket     = 1
const NATIVE_RECORDING_OPTIONS = {
  extension: ".wav",
  sampleRate: 44100,
  numberOfChannels: 2,
  // 16bit 双声道 44.1kHz CBR 比特率：44100 * 2 * 16 = 1,411,200 bps
  bitRate: 1411200,
  isMeteringEnabled: false,
  // ⚠️ Android 端 MediaRecorder 不支持直接录 LPCM/WAV，
  // 只能录 AAC-in-MP4 等容器；扩展名也必须改成 .m4a 否则混淆
  // （Android 音频解析另由专门的方案处理，见 Task #7）
  android: {
    extension: ".m4a",
    outputFormat: "mpeg4" satisfies AndroidOutputFormat,
    audioEncoder: "aac" satisfies AndroidAudioEncoder,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 1411200,
  },
  ios: {
    extension: ".wav",
    // 强制使用 Linear PCM（kAudioFormatLinearPCM）
    outputFormat: IOSOutputFormat.LINEARPCM,
    // PCM 不需要 audioQuality；保留 MIN 让 iOS 走最直通路径，
    // 避免 AVAudioSession 触发 VPIO/AGC/音量自动调节等会破坏 FFT 解码的处理
    audioQuality: AudioQuality.MIN,
    // 16bit 有符号整数，小端，packed —— 与 iOS 原生 mBitsPerChannel=16
    // + kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked 完全一致
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 1411200,
  },
};

type Stage = "instructions" | "waiting" | "recording" | "success" | "failed";

interface Props {
  onBack: () => void;
  onViewReport: (parsed: ParsedDeviceData | null) => void;
}

const RouterIcon = () => (
  <View
    style={{
      alignItems: "center",
      justifyContent: "center",
      width: 80,
      height: 70,
    }}
  >
    <View
      style={{
        width: 50,
        height: 4,
        borderRadius: 2,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: "#BBB",
        borderBottomWidth: 0,
        position: "absolute",
        top: 4,
      }}
    />
    <View
      style={{
        width: 70,
        height: 6,
        borderRadius: 3,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: "#BBB",
        borderBottomWidth: 0,
        position: "absolute",
        top: 0,
      }}
    />
    <View
      style={{
        width: 50,
        height: 30,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#BBB",
        position: "absolute",
        bottom: 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#BBB",
        }}
      />
    </View>
  </View>
);

const SignalIcon = () => (
  <View
    style={{
      alignItems: "center",
      justifyContent: "center",
      width: 80,
      height: 70,
    }}
  >
    <View
      style={{
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: "#DDD",
        position: "absolute",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        transform: [{ rotate: "45deg" }],
      }}
    />
    <View
      style={{
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 3,
        borderColor: "#BBB",
        position: "absolute",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        transform: [{ rotate: "45deg" }],
      }}
    />
    <View
      style={{
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#BBB",
      }}
    />
  </View>
);

const PlayIcon = () => (
  <View
    style={{
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    }}
  >
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderTopWidth: 4,
        borderBottomWidth: 4,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "#fff",
        marginLeft: 2,
      }}
    />
  </View>
);

// ─── 动画切换开关 ───────────────────────────────────────────────
// "gif"      → GIF 动画（audio_record.gif，默认）
// "waveform" → 声波柱动画（Waveform，保留备用）
type AnimMode = "gif" | "waveform";
const ANIM_MODE: AnimMode = "gif";

// ────────────────────────────────────────────────────────────────
// GIF 动画
// expo-image 在 iOS / Android 均原生支持 animated GIF，
// 动画跑在原生层，JS 线程上传/解析音频时不会卡顿
// ────────────────────────────────────────────────────────────────
const GIF_SOURCE = require("../../assets/audio_record.gif");

function useGifSize() {
  // 默认先用 1:1，等 asset 元数据就绪后更新
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  useEffect(() => {
    const asset = Asset.fromModule(GIF_SOURCE);
    if (asset.width && asset.height) {
      setSize({ w: asset.width, h: asset.height });
    } else {
      asset.downloadAsync().then(() => {
        if (asset.width && asset.height) {
          setSize({ w: asset.width, h: asset.height });
        }
      });
    }
  }, []);

  return size;
}

const GifAnimation = () => {
  const { width: screenW } = useWindowDimensions();
  const nativeSize = useGifSize();

  // 显示宽度：屏幕宽度 85%，最大 320px
  // 显示高度：按 GIF 真实宽高比等比换算
  const displayW = Math.min(Math.floor(screenW * 0.85), 320);
  const displayH =
    nativeSize.w > 0
      ? Math.round(displayW * (nativeSize.h / nativeSize.w))
      : displayW;

  const gifRef = useRef<{ startAnimating: () => Promise<void> }>(null);
  useEffect(() => {
    try {
      gifRef.current?.startAnimating();
    } catch {}
  }, []);

  return (
    <View
      style={{
        width: displayW,
        height: displayH,
        marginVertical: 8,
        backgroundColor: "transparent",
      }}
    >
      <ExpoImage
        ref={gifRef as any}
        source={GIF_SOURCE}
        style={{
          width: displayW,
          height: displayH,
          backgroundColor: "transparent",
        }}
        contentFit="contain"
        autoplay
        cachePolicy="memory"
        transition={{
          duration: 120,
          effect: "cross-dissolve",
          timing: "ease-in-out",
        }}
      />
    </View>
  );
};

// ────────────────────────────────────────────────────────────────
// 声波柱动画（保留，ANIM_MODE = "waveform" 时使用）
// ────────────────────────────────────────────────────────────────
const BAR_COUNT = 22;

// 注意：必须用 transform 而不是 height，
// 这样 useNativeDriver 才能成立 —— 动画会跑在 UI 线程，
// 上传/解析等 JS 线程上的耗时工作不会再卡到这条波形线
const BAR_BASE_HEIGHT = 70;

const Waveform = () => {
  const animsRef = useRef<Animated.Value[]>(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.2)),
  );

  useEffect(() => {
    const loops = animsRef.current.map((v, i) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 250 + Math.random() * 250,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.15 + Math.random() * 0.4,
            duration: 250 + Math.random() * 250,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) animate();
        });
      };
      setTimeout(animate, i * 30);
      return v;
    });
    return () => {
      loops.forEach((v) => v.stopAnimation());
    };
  }, []);

  return (
    <View style={styles.waveformRow}>
      {animsRef.current.map((v, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: BAR_BASE_HEIGHT,
            marginHorizontal: 2,
            justifyContent: "flex-end",
          }}
        >
          <Animated.View
            style={{
              width: 5,
              height: BAR_BASE_HEIGHT,
              borderRadius: 3,
              backgroundColor: Colors.primary,
              transform: [{ scaleY: v }],
              // scaleY 默认从中心缩放，需要ir�底部锚点
              // 通过 translateY 把缩放后的视觉中心拉回底部
            }}
          />
        </View>
      ))}
    </View>
  );
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const MAX_RECORD_SEC = 25;

export default function RecordingTestScreen({ onBack, onViewReport }: Props) {
  const [stage, setStage] = useState<Stage>("instructions");
  // stageRef 始终反映最新 stage，供 setInterval / async 回调读取，避免陈旧闭包
  const stageRef = useRef<Stage>("instructions");
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const [seconds, setSeconds] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [useTestAudio, setUseTestAudio] = useState<boolean>(true);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const parsedRef = useRef<ParsedDeviceData | null>(null);
  const inflightRef = useRef<boolean>(false);
  const lastSnapshotUriRef = useRef<string | null>(null);
  const [lastSnapshotUri, setLastSnapshotUri] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const timerRef = useRef<any>(null);
  const stopTimerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const allSamplesRef = useRef<Float32Array[]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nativeRecorder = useAudioRecorder(NATIVE_RECORDING_OPTIONS as any);
  const nativeRecorderRef = useRef<AudioRecorder | null>(null);
  const nativeActiveRef = useRef<boolean>(false);

  // Android 走 react-native-audio-record，把 16-bit raw PCM 流
  // 累积在内存里，每秒拼一次 WAV 头上传
  const androidPcmChunksRef = useRef<Uint8Array[]>([]);
  const androidPcmTotalRef = useRef<number>(0);
  const androidActiveRef = useRef<boolean>(false);

  const stopMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const encodeWAV = (
    samples: Float32Array,
    sampleRate: number,
    numChannels = 2,
  ): Blob => {
    const numFrames = samples.length / numChannels;
    const bytesPerSample = 2;
    const bytesPerFrame = bytesPerSample * numChannels;
    const dataSize = numFrames * bytesPerFrame;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerFrame, true);
    view.setUint16(32, bytesPerFrame, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(44 + i * 2, int16, true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const getMergedSamples = (): Float32Array => {
    const totalLength = allSamplesRef.current.reduce(
      (acc, arr) => acc + arr.length,
      0,
    );
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of allSamplesRef.current) {
      merged.set(arr, offset);
      offset += arr.length;
    }
    return merged;
  };

  const createWavBlob = (): Blob => {
    const samples = getMergedSamples();
    const actualRate = audioCtxRef.current?.sampleRate || 44100;
    return encodeWAV(samples, actualRate, 2);
  };

  const resolveAssetUri = (mod: any): string => {
    if (typeof mod === "string") return mod;
    if (mod?.uri) return mod.uri;
    if (mod?.default) return resolveAssetUri(mod.default);
    return "";
  };

  const clearTimers = () => {
    if (timerRef.current) {
      if (Array.isArray(timerRef.current)) {
        timerRef.current.forEach((t) => clearInterval(t));
      } else {
        clearInterval(timerRef.current);
      }
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    timerRef.current = null;
    stopTimerRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.disconnect();
        } catch {}
        scriptProcessorRef.current = null;
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch {}
        sourceNodeRef.current = null;
      }
      stopMic();
    };
  }, []);

  const handleParseSuccess = (data: ParsedDeviceData) => {
    if (stageRef.current !== "recording") {
      return;
    }
    parsedRef.current = data;
    setStatusMsg(
      `Parsed: ${data.model_no || "unknown"} · ${data.sn || "unknown"}`,
    );
    console.log("Parsed JSON data:", JSON.stringify(data, null, 2));
    clearTimers();
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    stopMic();
    setFinalDuration((s) => s);
    setStage("success");
  };

  const tryUploadCumulative = async () => {
    if (inflightRef.current) return;
    if (allSamplesRef.current.length === 0) return;
    inflightRef.current = true;
    try {
      const testData = {
        date: "2026-04-10",
        interconnect_events: {
          times: 5,
          last_time: 5,
        },
        battery_level: 4,
        low_battery_events: {
          warning_beeps: 4,
          last_beep: 4,
        },
        smoke_alarm: {
          times: 8,
          last_time: 8,
        },
        battery: 3.04,
        model_no: "R10RFP",
        duration: 6,
        sensor_status: 0,
        test_button_pressed: {
          times: 6,
          last_time: 6,
        },
        times_alarm_deactivated: {
          times: 7,
          last_time: 7,
        },
        dust_level: 1,
        sn: "217055232",
      } as ParsedDeviceData;
      handleParseSuccess(testData);
      return;
      const blob = createWavBlob();
      const result = await uploadAudioChunk(
        blob,
        `recording-${Date.now()}.wav`,
      );

      if (result.ok && result.data) {
        handleParseSuccess(result.data);
      } else if (result.status && result.status >= 500) {
        setStatusMsg(`Server error: ${result.status}`);
      } else {
        setStatusMsg("Listening for valid signal...");
      }
    } catch (e: any) {
      setStatusMsg(`Upload error: ${e?.message || "network"}`);
    } finally {
      inflightRef.current = false;
    }
  };

  const finalize = async () => {
    clearTimers();
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    stopMic();
    setFinalDuration((s) => s);

    // 录音停止前最后再上传一次（此时文件已 finalize，PCM 数据完整）
    if (
      (nativeActiveRef.current && nativeRecorderRef.current) ||
      androidActiveRef.current
    ) {
      if (!parsedRef.current) {
        try {
          await uploadCumulativeSnapshot();
        } catch {}
      }
    }
    await stopRecorder();

    if (parsedRef.current) {
      setStage("success");
    } else {
      setStage("failed");
    }
  };

  // 把目前为止累积的 raw PCM（来自 react-native-audio-record 的 'data' 事件）
  // 拼上合法 WAV 头，写到 cache 目录，返回快照 URI
  const buildAndroidSnapshotUri = async (): Promise<string | null> => {
    const total = androidPcmTotalRef.current;
    if (total < 4096) return null; // 不到 ~23ms 的双声道 16bit，跳过
    // 拷贝拼接（不要直接持有 ref 数组，防止下一次 data 事件改写）
    const pcm = new Uint8Array(total);
    let off = 0;
    for (const chunk of androidPcmChunksRef.current) {
      pcm.set(chunk, off);
      off += chunk.length;
    }
    await new Promise((r) => setTimeout(r, 0));

    const header = buildWavHeader(pcm.length);
    const wav = new Uint8Array(header.length + pcm.length);
    wav.set(header, 0);
    wav.set(pcm, header.length);

    const dir = (FileSystem.cacheDirectory as string) || "";
    const dstUri = `${dir}snapshot-${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(dstUri, bytesToBase64(wav), {
      encoding: "base64" as any,
    } as any);
    return dstUri;
  };

  const uploadCumulativeSnapshot = async () => {
    if (inflightRef.current) return;
    if (parsedRef.current) return;

    let uri: string | null = null;
    let snapshotUri: string | null = null;

    inflightRef.current = true;
    try {
      // 让出一帧时间，避免和动画的下一帧 schedule 抢 JS 线程
      await new Promise((r) => setTimeout(r, 0));

      if (androidActiveRef.current) {
        // Android：直接用内存里的 raw PCM 拼 WAV
        snapshotUri = await buildAndroidSnapshotUri();
      } else {
        // iOS：从 expo-audio 写出的 .wav 文件里抽 PCM 重拼
        const recorder = nativeRecorderRef.current;
        if (!recorder) return;
        uri = recorder.uri;
        if (!uri) return;
        snapshotUri = await buildPcmSnapshot(uri);
      }

      if (!snapshotUri) {
        // 文件还没积累到任何 PCM 数据，下一轮再试
        return;
      }
      // 记录最新一次合法 WAV 快照路径，失败时供用户导出
      lastSnapshotUriRef.current = snapshotUri;
      setLastSnapshotUri(snapshotUri);

      // 这个快照是我们自己用已知 44100/2/16/PCM 重建的，
      // 头部一定合法，省去再读一次整文件做校验
      await new Promise((r) => setTimeout(r, 0));

      const result = await uploadAudioChunk(
        {
          uri: snapshotUri,
          name: `recording-${Date.now()}.wav`,
          type: "audio/wav",
        },
        `recording-${Date.now()}.wav`,
      );
      if (result.ok && result.data) {
        handleParseSuccess(result.data);
        await stopRecorder();
      } else if (result.status && result.status >= 500) {
        setStatusMsg(`Server error: ${result.status}`);
      } else {
        setStatusMsg("Listening for valid signal...");
      }
    } catch (e: any) {
      setStatusMsg(`Upload error: ${e?.message || "network"}`);
    } finally {
      inflightRef.current = false;
    }
  };

  const stopRecorder = async () => {
    if (androidActiveRef.current && AndroidAudioRecord) {
      androidActiveRef.current = false;
      try {
        // 停止 + 让本地 wav 文件 finalize（我们其实只用内存 PCM，
        // 但还是要 stop 让录音线程退出，否则下次 init 会失败）
        await AndroidAudioRecord.stop();
      } catch {}
      try {
        // 解绑 data 事件（不同版本 API 略有差异，做容错）
        if (typeof AndroidAudioRecord.removeAllListeners === "function") {
          AndroidAudioRecord.removeAllListeners("data");
        }
      } catch {}
      // 注意：不立即清空 chunks，finalize() 里的最后一次上传还要用
    }
    nativeActiveRef.current = false;
    const recorder = nativeRecorderRef.current;
    nativeRecorderRef.current = null;
    if (recorder) {
      try {
        await recorder.stop();
      } catch {}
    }
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const already = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        if (already) return true;

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message:
              "This app needs microphone access to read smoke alarm inspection data.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Deny",
            buttonPositive: "Allow",
          },
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            "Microphone Permission Required",
            "Microphone access was denied.\n\nTo enable: Settings → Apps → Red Inspection → Permissions → Microphone → Allow",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => setStage("instructions"),
              },
              {
                text: "Go to Settings",
                onPress: () => {
                  Linking.openSettings();
                  setStage("instructions");
                },
              },
            ],
          );
        } else {
          setStatusMsg("Permission denied — tap Start again and tap Allow.");
          stopTimerRef.current = setTimeout(
            () => setStage("instructions"),
            3000,
          );
        }
        return false;
      } catch (err) {
        return false;
      }
    } else {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        if (perm.canAskAgain === false) {
          Alert.alert(
            "Microphone Permission Required",
            "Please enable microphone access in Settings.",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => setStage("instructions"),
              },
              {
                text: "Open Settings",
                onPress: () => {
                  Linking.openSettings();
                  setStage("instructions");
                },
              },
            ],
          );
        } else {
          setStatusMsg(
            "Microphone permission denied. Tap Start again and allow access.",
          );
          stopTimerRef.current = setTimeout(
            () => setStage("instructions"),
            2500,
          );
        }
        return false;
      }
      return true;
    }
  };

  const startNativeRecording = async () => {
    try {
      const granted = await requestMicPermission();
      if (!granted) return;
      if (Platform.OS === "ios") {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } else {
        await setAudioModeAsync({
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: true,
          interruptionMode: "duckOthers",
          allowsBackgroundRecording: true,
        });
      }
      if (Platform.OS === "android") {
        // Android MUST use react-native-audio-record for raw 16-bit PCM.
        // expo-audio only gives compressed AAC which cannot be FFT-decoded.
        if (!AndroidAudioRecord) {
          // Module not linked → fail clearly instead of falling back silently
          setStage("instructions");
          Alert.alert("Recording Unavailable");
          return;
        }
        // 44100 Hz / 双声道 / 16-bit PCM
        // audioSource 6 = VOICE_RECOGNITION（关闭 AGC/降噪/回声消除，
        // 这些处理会破坏后续 FFT 解码）
        AndroidAudioRecord.init({
          sampleRate: 44100,
          channels: 2,
          bitsPerSample: 16,
          audioSource: 6,
          wavFile: `rec-${Date.now()}.wav`,
        });
        androidPcmChunksRef.current = [];
        androidPcmTotalRef.current = 0;
        AndroidAudioRecord.on("data", (data: string) => {
          // data 是 base64 编码的 raw PCM 块（约 100ms 一个）
          try {
            const bytes = base64ToBytes(data);
            androidPcmChunksRef.current.push(bytes);
            androidPcmTotalRef.current += bytes.length;
          } catch {}
        });
        AndroidAudioRecord.start();
        androidActiveRef.current = true;
      } else {
        const recorder = nativeRecorder;
        nativeRecorderRef.current = recorder;
        nativeActiveRef.current = true;
        await recorder.prepareToRecordAsync();
        recorder.record();
      }

      setStage("recording");
      setSeconds(0);
      const tick = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          setFinalDuration(next);
          return next;
        });
      }, 1000);

      // 不停止录音；每 1 秒读取目前为止累积的 PCM 数据，
      // 现场重建合法 WAV 头后上传整段累积音频
      const SNAPSHOT_MS = 1000;
      const snapshotInterval = setInterval(() => {
        uploadCumulativeSnapshot();
      }, SNAPSHOT_MS);
      timerRef.current = [tick, snapshotInterval];

      stopTimerRef.current = setTimeout(finalize, MAX_RECORD_SEC * 1000);
    } catch (err: any) {
      setStatusMsg(`Recording error: ${err?.message || ""}`);
      stopTimerRef.current = setTimeout(() => setStage("failed"), 1200);
    }
  };

  const startTesting = async () => {
    setStage("waiting");
    setStatusMsg("");
    parsedRef.current = null;
    allSamplesRef.current = [];

    if (Platform.OS !== "web") {
      await startNativeRecording();
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatusMsg("Microphone not available on this platform");
      stopTimerRef.current = setTimeout(() => setStage("failed"), 1200);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const W: any = window as any;
      const Ctx: any = W.AudioContext || W.webkitAudioContext;
      if (!Ctx) {
        setStatusMsg("AudioContext not supported");
        stopTimerRef.current = setTimeout(() => setStage("failed"), 1200);
        return;
      }

      const audioCtx: AudioContext = new Ctx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const bufferSize = 4096;
      const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        const channelData = event.inputBuffer.getChannelData(0);
        // Convert mono to stereo (duplicate to both channels)
        const stereo = new Float32Array(channelData.length * 2);
        for (let i = 0; i < channelData.length; i++) {
          stereo[i * 2] = channelData[i];
          stereo[i * 2 + 1] = channelData[i];
        }
        allSamplesRef.current.push(stereo);
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      setStage("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          setFinalDuration(next);
          return next;
        });
      }, 1000);

      // Start periodic upload
      const uploadInterval = setInterval(() => {
        tryUploadCumulative();
      }, 1000);
      timerRef.current = [timerRef.current, uploadInterval];

      stopTimerRef.current = setTimeout(finalize, MAX_RECORD_SEC * 1000);
    } catch (err: any) {
      setStatusMsg(`Mic permission denied: ${err?.message || ""}`);
      stopTimerRef.current = setTimeout(() => setStage("failed"), 1200);
    }
  };

  const exportFailedAudio = async () => {
    const uri = lastSnapshotUriRef.current || lastSnapshotUri;
    console.log("[export] start, uri =", uri);
    if (!uri) {
      setStatusMsg("No audio available to export.");
      return;
    }
    setExporting(true);
    try {
      if (Platform.OS === "web") {
        // Web 浏览器：直接 fetch blob 触发下载（cacheDirectory 在 web 是 blob:/idb 路径，fetch 可读）
        let blob: Blob;
        try {
          const resp = await fetch(uri);
          blob = await resp.blob();
        } catch {
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64" as any,
          } as any);
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          blob = new Blob([bytes], { type: "audio/wav" });
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `failed-recording-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        console.log("[export] web download triggered");
      } else {
        // 原生：先确认文件还在，再用系统分享面板导出
        const info: any = await FileSystem.getInfoAsync(uri, {
          size: true,
        } as any);
        console.log("[export] file info:", JSON.stringify(info));
        if (!info.exists) {
          setStatusMsg("Audio file no longer exists.");
          return;
        }

        const available = await Sharing.isAvailableAsync();
        console.log("[export] sharing available:", available);
        if (!available) {
          setStatusMsg("Sharing not available on this device.");
          return;
        }

        // 复制到一个固定可读名字，避免 Sharing 用临时随机名
        const dir = (FileSystem.cacheDirectory as string) || "";
        const exportUri = `${dir}failed-recording-${Date.now()}.wav`;
        try {
          await FileSystem.copyAsync({ from: uri, to: exportUri });
        } catch (copyErr: any) {
          console.log("[export] copy error:", copyErr?.message);
        }
        const finalUri = exportUri.startsWith("file://")
          ? exportUri
          : `file://${exportUri.replace(/^\/+/, "/")}`;
        console.log("[export] sharing uri:", finalUri);

        await Sharing.shareAsync(finalUri, {
          mimeType: "audio/wav",
          dialogTitle: "Export failed recording",
          UTI: "com.microsoft.waveform-audio",
        });
      }
    } catch (e: any) {
      console.log("[export] error:", e?.message || e);
      setStatusMsg(`Export error: ${e?.message || ""}`);
    } finally {
      setExporting(false);
    }
  };

  const recordAgain = () => {
    clearTimers();
    lastSnapshotUriRef.current = null;
    setLastSnapshotUri(null);
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    stopMic();
    setSeconds(0);
    setFinalDuration(0);
    setStatusMsg("");
    parsedRef.current = null;
    allSamplesRef.current = [];
    setStage("instructions");
  };

  const stopEarly = () => {
    finalize();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          testID="button-back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.body}>
        {stage === "instructions" && (
          <>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <RouterIcon />
              </View>
              <Text style={styles.cardTitle}>
                Device Connection Instructions
              </Text>
              <View style={styles.instructionsList}>
                <Text style={styles.instructionLine}>
                  1. Ensure the test device is properly connected.
                </Text>
                <Text style={styles.instructionLine}>
                  2. Move the mobile phone close to the alarm device.
                </Text>
                <Text style={styles.instructionLine}>
                  3. Ensure the surrounding environment is quiet.
                </Text>
                <Text style={styles.instructionLine}>
                  4. Prepare to trigger the alarm device.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.testAudioToggle}
                onPress={() => setUseTestAudio((v) => !v)}
                activeOpacity={0.8}
                testID="toggle-test-audio"
              >
                <View
                  style={[styles.checkbox, useTestAudio && styles.checkboxOn]}
                >
                  {useTestAudio && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.testAudioLabel}>
                  Play bundled test audio (R10RFP)
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={startTesting}
              activeOpacity={0.85}
              testID="button-start-testing"
            >
              <PlayIcon />
              <Text style={styles.primaryBtnText}>Start testing</Text>
            </TouchableOpacity>
          </>
        )}

        {stage === "waiting" && (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <SignalIcon />
            </View>
            <Text style={styles.statusTitle}>
              Waiting for alarm to trigger...
            </Text>
            <Text style={styles.statusSubtitle}>
              Please operate the external device to begin playback.
            </Text>
            <Text style={[styles.statusSubtitle, { marginTop: 14 }]}>
              The system will automatically detect the signal and start
              recording.
            </Text>
            {!!statusMsg && (
              <Text
                style={[
                  styles.statusSubtitle,
                  { marginTop: 10, color: Colors.primary },
                ]}
              >
                {statusMsg}
              </Text>
            )}
          </View>
        )}

        {stage === "recording" && (
          <>
            <View style={styles.card}>
              {ANIM_MODE === "gif" ? <GifAnimation /> : <Waveform />}
              <Text style={[styles.statusTitle, { marginTop: 18 }]}>
                Recording...
              </Text>
              <Text style={styles.timer}>{formatDuration(seconds)}</Text>
              {!!statusMsg && (
                <Text
                  style={[
                    styles.statusSubtitle,
                    { marginTop: 6, color: Colors.primary },
                  ]}
                >
                  {statusMsg}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#888" }]}
              onPress={stopEarly}
              activeOpacity={0.85}
              testID="button-stop-recording"
            >
              <Text style={styles.primaryBtnText}>Stop now</Text>
            </TouchableOpacity>
          </>
        )}

        {stage === "success" && (
          <>
            <View style={styles.card}>
              <View style={styles.bigCheckCircle}>
                <Text style={styles.bigCheckText}>✓</Text>
              </View>
              <Text style={styles.resultTitle}>Recording successful.</Text>
              <Text style={styles.statusSubtitle}>
                Test completed and report generated.
              </Text>
              <Text style={styles.statusSubtitle}>
                Recording duration:{" "}
                <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                  {formatDuration(finalDuration || 0)}
                </Text>
              </Text>
              {parsedRef.current && (
                <Text style={[styles.statusSubtitle, { marginTop: 8 }]}>
                  Parsed device:{" "}
                  <Text style={{ color: Colors.primary, fontWeight: "700" }}>
                    {parsedRef.current.model_no} / {parsedRef.current.sn}
                  </Text>
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => onViewReport(parsedRef.current)}
              activeOpacity={0.85}
              testID="button-view-report"
            >
              <Text style={styles.primaryBtnText}>View Report</Text>
            </TouchableOpacity>
            {lastSnapshotUri && (
              <TouchableOpacity
                style={[styles.secondaryBtn, exporting && { opacity: 0.6 }]}
                onPress={exportFailedAudio}
                disabled={exporting}
                activeOpacity={0.85}
                testID="button-export-audio"
              >
                <Text style={styles.secondaryBtnText}>
                  {exporting ? "Exporting..." : "Export audio"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {stage === "failed" && (
          <>
            <View style={styles.card}>
              <View style={styles.bigFailCircle}>
                <Text style={styles.bigFailText}>✕</Text>
              </View>
              <Text style={styles.resultTitle}>Recording failed.</Text>
              <Text style={styles.statusSubtitle}>
                {statusMsg || "No valid alarm sound detected."}
              </Text>
              <Text style={styles.statusSubtitle}>
                Please check the device connection and try again.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={recordAgain}
              activeOpacity={0.85}
              testID="button-record-again"
            >
              <Text style={styles.primaryBtnText}>Record again</Text>
            </TouchableOpacity>
            {lastSnapshotUri && (
              <TouchableOpacity
                style={[styles.secondaryBtn, exporting && { opacity: 0.6 }]}
                onPress={exportFailedAudio}
                disabled={exporting}
                activeOpacity={0.85}
                testID="button-export-audio"
              >
                <Text style={styles.secondaryBtnText}>
                  {exporting ? "Exporting..." : "Export audio"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const SUCCESS_GREEN = "#1FA67A";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", paddingTop: 50 },
  header: {
    height: 52,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 28, color: "#222", marginTop: -2 },
  headerTitle: { fontSize: 17, color: "#222", fontWeight: "500" },
  headerRight: { width: 36 },
  body: { flex: 1, paddingHorizontal: 14, paddingTop: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
    minHeight: 230,
    justifyContent: "center",
  },
  iconWrap: {
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    color: "#222",
    fontWeight: "600",
    marginBottom: 14,
  },
  instructionsList: { alignSelf: "stretch" },
  instructionLine: { fontSize: 12, color: "#666", lineHeight: 20 },
  statusTitle: {
    fontSize: 14,
    color: "#222",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  statusSubtitle: {
    fontSize: 12,
    color: "#999",
    lineHeight: 18,
    textAlign: "center",
  },
  timer: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
    marginVertical: 4,
  },
  waveformRow: { flexDirection: "row", alignItems: "center", height: 80 },
  bigCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: SUCCESS_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bigCheckText: {
    color: SUCCESS_GREEN,
    fontSize: 32,
    fontWeight: "700",
    marginTop: -4,
  },
  bigFailCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  bigFailText: {
    color: Colors.primary,
    fontSize: 30,
    fontWeight: "700",
    marginTop: -2,
  },
  resultTitle: {
    fontSize: 15,
    color: "#222",
    fontWeight: "600",
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    marginTop: 14,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    flexDirection: "row",
    marginTop: 10,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: "600" },
  testAudioToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#BBB",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: -1 },
  testAudioLabel: { fontSize: 12, color: "#444" },
});
