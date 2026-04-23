import { Platform } from 'react-native';
import { Device } from '../types';
import {
  sensorStatusText,
  dustLevelText,
  replacementText,
  formatEvent,
  formatLowBattery,
} from './protocolDisplay';

export interface ReportPhotos {
  deviceCode: string | null;
  equipmentLocation: string | null;
}

export interface ActionResult {
  issueTitle: string;
  actionLabel: string;
  result: string;
}

export interface CompletedReport {
  id: string;
  taskId: string;
  employeeId: string;
  taskNumber: string;
  inspectedAt: string;
  device: Device;
  location: { roomType: string; roomNumber: string };
  actions: ActionResult[];
  photos: ReportPhotos;
  devicesInspected: number;
}

const esc = (s: string | number | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );

const placeholder =
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 100'>` +
    `<rect width='140' height='100' fill='#F5F5F5' rx='4'/>` +
    `<rect x='45' y='15' width='50' height='38' rx='4' fill='none' stroke='#CCC' stroke-width='2'/>` +
    `<circle cx='60' cy='30' r='5' fill='#CCC'/>` +
    `<polyline points='45,53 65,35 80,47 100,30 115,53' fill='none' stroke='#CCC' stroke-width='2'/>` +
    `<line x1='55' y1='70' x2='85' y2='70' stroke='#CCC' stroke-width='2'/>` +
    `<line x1='70' y1='60' x2='70' y2='80' stroke='#CCC' stroke-width='2'/>` +
    `</svg>`
  )}`;

// ── CSS ─────────────────────────────────────────────────────────
const CSS = `
  @page { size: letter portrait; margin: 0; }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #222;
    background: #DCDCDC;
    margin: 0;
    padding: 24px 0;
  }

  /* ── One page = one letter sheet shown as a card ── */
  .page {
    width: 8.5in;
    height: 11in;
    margin: 0 auto 32px;
    background: #fff;
    box-shadow: 0 3px 14px rgba(0,0,0,0.28);
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  /* ── Print: remove card styling, add page breaks ── */
  @media print {
    body { background: #fff; padding: 0; }
    .page {
      width: 100%;
      height: 100vh;
      margin: 0;
      box-shadow: none;
      page-break-after: always;
      break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  /* ── Header ── */
  .topbar {
    background: #ED1C29;
    color: #fff;
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
  }
  .top-title { font-size: 14px; font-weight: 700; }
  .top-meta  { font-size: 9.5px; opacity: 0.9; margin-top: 2px; }
  .topbar-right { text-align: right; font-size: 9.5px; line-height: 1.55; }

  /* ── Content area fills remaining height ── */
  .content { flex: 1; overflow: hidden; padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 7px; }

  /* ── Sections ── */
  .section { border: 1px solid #E0E0E0; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .section-title {
    padding: 5px 10px;
    font-weight: 700;
    font-size: 10px;
    border-bottom: 2px solid #ED1C29;
    background: #fff;
  }

  /* ── Data grid ── */
  .grid { width: 100%; border-collapse: collapse; }
  .grid td { padding: 4px 8px; border-top: 1px solid #F0F0F0; vertical-align: middle; font-size: 9.5px; line-height: 1.35; }
  td.label  { color: #888; width: 22%; }
  td.cell   { width: 28%; font-weight: 500; }
  td.label2 { color: #888; width: 22%; border-left: 1px solid #F0F0F0; }

  /* ── Issues ── */
  .issue-label { color: #ED1C29; padding: 4px 8px; font-size: 9.5px; font-weight: 600; border-top: 1px solid #F0F0F0; background: #fff; }

  /* ── Photos ── */
  .photos { display: flex; gap: 10px; padding: 8px 10px; }
  .photo-box { flex: 1; text-align: center; }
  .photo-label { font-size: 9px; color: #666; margin-bottom: 4px; }
  .photo-frame {
    background: #F5F5F5;
    border-radius: 3px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .photo-frame img { max-width: 100%; max-height: 100%; object-fit: cover; }

  /* ── Toolbar (web only) ── */
  .toolbar {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 99;
    display: flex;
    gap: 8px;
  }
  .toolbar button {
    background: #ED1C29;
    color: #fff;
    border: 0;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
  }
  .toolbar button.sec { background: #666; }
`;

// ── Build one page's HTML ────────────────────────────────────────
const buildPageHtml = (r: CompletedReport, totalDevices: number): string => {
  const d = r.device;
  const photo1 = r.photos.deviceCode || placeholder;
  const photo2 = r.photos.equipmentLocation || placeholder;

  const eventPairs: Array<[string, string, string, string]> = [
    ['Manual Test',    formatEvent(d.test_button_pressed),      'Alarm Deactivated',     formatEvent(d.times_alarm_deactivated)],
    ['Optical Sensor', formatEvent(d.smoke_alarm),              'Interconnection',       formatEvent(d.interconnect_events)],
    ['Low Battery',    formatLowBattery(d.low_battery_events),  'Mains Power Off',       formatEvent(d.main_power_events)],
    ['Wrong Wiring',   formatEvent(d.wrong_wiring_events),      'Wired Interconnection', formatEvent(d.wire_interconnect_events)],
  ];

  const issueGroups: Record<string, ActionResult[]> = {};
  r.actions.forEach((a) => {
    if (!issueGroups[a.issueTitle]) issueGroups[a.issueTitle] = [];
    issueGroups[a.issueTitle].push(a);
  });

  const issuesHtml = Object.keys(issueGroups)
    .map((title, idx) => {
      const list = issueGroups[title];
      let rows = '';
      for (let i = 0; i < list.length; i += 2) {
        const a = list[i];
        const b = list[i + 1];
        rows += `<tr>
          <td class="label">${esc(a.actionLabel)}</td>
          <td class="cell">${esc(a.result || '-')}</td>
          <td class="label2">${esc(b ? b.actionLabel : '')}</td>
          <td class="cell">${esc(b ? b.result : '')}</td>
        </tr>`;
      }
      return `<div class="issue-label">Issue ${idx + 1}: ${esc(title)}</div>
               <table class="grid"><tbody>${rows}</tbody></table>`;
    })
    .join('');

  const location = [r.location.roomType, r.location.roomNumber].filter(Boolean).join(' ') || '-';

  return `<div class="page">
  <div class="topbar">
    <div class="topbar-left">
      <div class="top-title">(Red) Inspection Checklist</div>
      <div class="top-meta">Task: ${esc(r.taskNumber)}&nbsp;&nbsp;&nbsp;Employee: ${esc(r.employeeId)}</div>
    </div>
    <div class="topbar-right">
      <div>${esc(r.inspectedAt)}</div>
      <div>${esc(totalDevices)} device${totalDevices !== 1 ? 's' : ''} inspected</div>
    </div>
  </div>

  <div class="content">
    <!-- Device Information -->
    <div class="section">
      <div class="section-title">Device Information</div>
      <table class="grid"><tbody>
        <tr>
          <td class="label">Device Model</td><td class="cell">${esc(d.model_no)}</td>
          <td class="label2">Serial Number (SN)</td><td class="cell">${esc(d.sn)}</td>
        </tr>
        <tr>
          <td class="label">Inspection Date</td><td class="cell">${esc(r.inspectedAt)}</td>
          <td class="label2">Replacement Date</td><td class="cell">${esc(d.date)}</td>
        </tr>
        <tr>
          <td class="label">Days Remaining</td><td class="cell">${esc(replacementText(d.duration))}</td>
          <td class="label2">Date Code</td><td class="cell">${esc(d.date)}</td>
        </tr>
        <tr>
          <td class="label">Sensor Status</td><td class="cell">${esc(sensorStatusText(d.sensor_status))}</td>
          <td class="label2">Battery Voltage</td><td class="cell">${d.battery.toFixed(2)}V</td>
        </tr>
        <tr>
          <td class="label">Alarm On Duration</td><td class="cell">${esc(d.duration)} days</td>
          <td class="label2">Dust Contamination</td><td class="cell">${esc(dustLevelText(d.dust_level))}</td>
        </tr>
      </tbody></table>
    </div>

    <!-- Alarm Event History -->
    <div class="section">
      <div class="section-title">Alarm Event History</div>
      <table class="grid"><tbody>
        ${eventPairs.map(([l1, v1, l2, v2]) =>
          `<tr>
            <td class="label">${esc(l1)}</td><td class="cell">${esc(v1)}</td>
            <td class="label2">${esc(l2)}</td><td class="cell">${esc(v2)}</td>
          </tr>`
        ).join('')}
      </tbody></table>
    </div>

    <!-- Location & Issues -->
    <div class="section">
      <div class="section-title">Location</div>
      <table class="grid"><tbody>
        <tr>
          <td class="label">Alarm Location</td>
          <td class="cell" colspan="3">${esc(location)}</td>
        </tr>
      </tbody></table>
      ${issuesHtml}
    </div>

    <!-- Inspection Photos -->
    <div class="section">
      <div class="section-title">Inspection Photos</div>
      <div class="photos">
        <div class="photo-box">
          <div class="photo-label">Device Code Photo</div>
          <div class="photo-frame"><img src="${photo1}" alt="device code"/></div>
        </div>
        <div class="photo-box">
          <div class="photo-label">Equipment Location Photos</div>
          <div class="photo-frame"><img src="${photo2}" alt="equipment location"/></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
};

// ── Build full HTML document ─────────────────────────────────────
const buildDocument = (reports: CompletedReport[], taskNumber: string): string => {
  const total = reports.reduce((n, r) => Math.max(n, r.devicesInspected), reports.length);
  const pages = reports.map((r) => buildPageHtml(r, total)).join('\n');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>Inspection Report – Task ${esc(taskNumber)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Save / Print PDF</button>
    <button class="sec" onclick="window.close()">Close</button>
  </div>
  ${pages}
</body>
</html>`;
};

// ── Public API ───────────────────────────────────────────────────
export const buildHtmlDocument = (
  reports: CompletedReport[],
  taskNumber: string,
): string => buildDocument(reports, taskNumber);

export const generateTaskPdf = async (
  reports: CompletedReport[],
  taskNumber: string,
) => {
  if (reports.length === 0) return;
  const html = buildDocument(reports, taskNumber);

  // Web: open in a new tab showing page cards + print button
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
    return;
  }

  // Native: generate PDF and share
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 816,   // 8.5in @ 96dpi
      height: 1056, // 11in @ 96dpi
    });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Inspection Report – Task ${taskNumber}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (e) {
    console.warn('PDF generation failed', e);
  }
};
