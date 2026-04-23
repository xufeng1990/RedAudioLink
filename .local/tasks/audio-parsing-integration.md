# Audio Parsing Integration

## What & Why
把附件提供的 C++ 音频解析算法（`proto_parse.cpp/h`，依赖 FFTW3，可识别 R240P / RSDUALP / R10RFP / RFMDUAL / Guardion Smoke Detector 这 5 种烟感探测器协议）接入到 App 的巡检流程中。技术员在 Recording Test 页面对着探测器录音后，App 把音频上传到后端，后端调用 C++ 解析程序得到设备数据 JSON，自动填回当前巡检报告，并持久化保存以便在报告页面和 PDF 中展示。

## Done looks like
- 后端有一个上传音频并返回解析结果的接口；服务器上能成功把 `proto_parse.cpp` 编译成可执行程序（含 FFTW3 依赖）。
- 用 5 个测试 wav 调用接口，返回的 JSON 与附件中对应的 JSON 输出一致（字段、SN、电池、各事件计数等匹配）。
- Recording Test 页面不再是假动画：按下后真实录音，结束后自动上传并解析，识别成功显示型号 / SN / 电池 / 主要事件摘要；识别失败显示明确错误并允许重试。
- 解析出的 JSON 会写入当前巡检设备对象（`Device` 中的 Red Protocol 字段），后续 Device Inspection 页面、Report 页面、生成的 PDF 都能展示这些真实解析数据，而不是 mock 数据。
- 完整的测试音频样本和期望 JSON 落库在仓库中（用于回归测试），并提供一份简单的脚本/说明把样本批量跑一遍验证一致。

## Out of scope
- 端侧（手机）离线解析、把 C++ 编进原生模块、移植成 JS/WASM —— 本任务仅做后端解析方案。
- 5 种型号之外的协议扩展。
- 录音过程中的实时流式解析（本期一次性录完再上传即可）。
- 用户管理、登录改造、报告模板大改等无关内容。

## Steps
1. **资产入库**：把附件里的 `proto_parse.cpp`、`proto_parse.h` 放到 `server/audio-parser/` 下；把 5 个测试 wav + 对应 json 放到 `server/audio-parser/testdata/`，作为算法源码与回归样本。文件名按附件原样保留（含中文/空格亦可，引用时用相对路径）。

2. **后端构建解析二进制**：在 `server/audio-parser/` 下加一个最小的 `main.cpp` 包装器，命令行接收一个 wav 路径，读取 PCM 数据喂给 `ProtoParseChannel::PushBuffer`，把识别结果按附件 JSON 字段格式输出到 stdout。提供构建脚本（如 `build.sh` 或 Makefile），用 `g++` 链接 `fftw3` 生成 `proto_parse_cli` 可执行文件。在 Replit 环境通过 package management 安装 `fftw` 系统依赖和 `gcc`，并在项目启动/post-merge 脚本里确保二进制存在（首启动若不存在就构建一次）。

3. **解析输出对齐**：让 CLI 输出严格匹配附件 JSON 字段名与结构（`model_no`、`SN`、`date`、`duration`、`sensor_status`、`battery_level`、`battery`、`dust_level`、`main_power_status`、`main_power_events / Wrong_Wiring_events / Wire_Interconnect_events / Interconnect_events / low_battery_events / test_button_pressed / times_alarm_deactivated / smoke_alarm` 等）。注意不同型号字段不同（如 Guardion 不含 wiring 类字段）—— 与样本 JSON 一致即可。

4. **回归测试脚本**：在 `server/audio-parser/` 下加一个 Node 脚本（如 `verify.ts` 或 `verify.js`），遍历 `testdata/` 中所有 wav，调用 CLI，把结果与同名 json 做字段级 diff，全部一致才算通过。这个脚本要能本地手动跑通。

5. **后端 API 接口**：在 `server/routes.ts` 新增 `POST /api/audio/parse`，使用 `multer`（或等价方案）接收一个 wav 文件上传，写到临时文件，调用 `proto_parse_cli`，把 JSON 透传回前端；失败（无识别结果 / 二进制异常 / 超时）返回结构化错误（HTTP 422 + `{ error, detail }`）。需要鉴权的话沿用现有 `requireAuth`。

6. **前端录音 + 上传**：改造 `mobile/src/screens/RecordingTestScreen.tsx`，把当前的"假 waveform / 模拟阶段切换"替换为：
   - 用 `expo-av` 申请麦克风权限并真实录音（wav / 高质量 PCM 设置；Android/iOS/Web 三端做兼容，Web 端用 MediaRecorder fallback）。
   - 录制结束后用 `fetch + FormData` 上传到 `/api/audio/parse`，期间显示 loading 状态。
   - 成功：进入"success"阶段，展示型号、SN、电池电压/等级、传感器状态、关键事件计数摘要；并提供"查看报告 / 写入报告"按钮。
   - 失败：进入"failed"阶段，给出原因并允许重试。

7. **解析结果回填巡检流程**：把解析得到的 JSON 通过 `App.tsx` 的状态/回调（或新建一个轻量的 `parsedDeviceData` context）传到当前 `Device` 上，覆盖/合并 `model_no / sn / battery / sensor_status / *_events` 等 Red Protocol 字段。`DeviceInspectionScreen` 已经能消费这些字段，确认其 UI 显示的是解析后的真实数据，而不是 mockData。

8. **持久化与报告 / PDF**：在保存巡检报告时把解析得到的完整 JSON 一并存下来（如果走后端 reports 接口，对 `reports` 表/字段做最小扩展，保存原始 JSON；若仍是本地 mock 流程，则挂在 `CompletedReport.device` 上即可）。确认 `mobile/src/utils/generateReportPdf.ts` 渲染时各事件、SN、电池等用的是解析数据。

9. **错误与边界**：处理麦克风权限被拒、录音过短、网络失败、二进制崩溃、未识别到任何包等情况，给出清晰提示；后端对上传文件大小/时长设上限（例如 10MB / 30s）。

10. **冒烟验证**：用附件 5 个样本走一次"上传 → 解析 → 回填 → 生成 PDF"完整链路（可在测试页面加一个临时入口直接上传 testdata 中的 wav，方便没真实设备时验证），确保字段全部正确显示。

## Relevant files
- `mobile/src/screens/RecordingTestScreen.tsx`
- `mobile/src/screens/DeviceInspectionScreen.tsx`
- `mobile/src/screens/ReportViewScreen.tsx`
- `mobile/src/utils/generateReportPdf.ts`
- `mobile/src/utils/protocolDisplay.ts`
- `mobile/src/types/index.ts`
- `mobile/src/data/mockData.ts`
- `mobile/App.tsx`
- `server/routes.ts`
- `server/index.ts`
- `server/storage.ts`
- `attached_assets/AudioLink解析_1776418163531.zip`
- `attached_assets/测试音频+JSON输出_1776418172103.zip`
