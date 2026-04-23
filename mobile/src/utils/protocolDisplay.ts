import { ProtocolEvent, LowBatteryEvent } from '../types';

export const RED = '#ED1C29';
export const GREEN = '#1FA67A';
export const AMBER = '#F2B43E';

export const sensorStatusText = (v?: number) => (v === 1 ? 'Fault' : 'Normal');
export const sensorStatusColor = (v?: number) => (v === 1 ? RED : GREEN);

export const dustLevelText = (v?: number) => {
  switch (v) {
    case 3: return 'Contamination Fault';
    case 2: return 'Contamination Warning';
    case 1: return 'Light Contamination';
    default: return 'No Contamination';
  }
};
export const dustLevelColor = (v?: number) =>
  v === 3 ? RED : v === 2 ? AMBER : v === 1 ? AMBER : GREEN;

export const replacementText = (duration?: number) => {
  if (duration == null) return '—';
  if (duration >= 3650) return 'Replacement Required';
  if (duration >= 3285) return 'Replacement Warning';
  return 'Operating Normally';
};
export const replacementColor = (duration?: number) => {
  if (duration == null) return '#999';
  if (duration >= 3650) return RED;
  if (duration >= 3285) return AMBER;
  return GREEN;
};

export const batteryRatio = (level?: number) => {
  switch (level) {
    case 4: return 1;
    case 3: return 0.66;
    case 2: return 0.33;
    case 1: return 0.15;
    default: return 0;
  }
};
export const batteryColor = (level?: number, voltage?: number) => {
  if (level != null) {
    if (level >= 3) return GREEN;
    if (level === 2) return AMBER;
    return RED;
  }
  if (voltage != null) {
    if (voltage >= 3.0) return GREEN;
    if (voltage >= 2.7) return AMBER;
    return RED;
  }
  return GREEN;
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const formatDays = (n?: number) => {
  if (n == null) return '—';
  if (n === 0) return 'Never';
  return plural(n, 'day');
};

export const formatEvent = (e?: ProtocolEvent) => {
  if (!e || e.times === 0) return `0 time, Never`;
  return `${plural(e.times, 'time')}, last ${formatDays(e.last_time)}`;
};

export const formatLowBattery = (e?: LowBatteryEvent) => {
  if (!e || e.warning_beeps === 0) return `0 beep, Never`;
  return `${plural(e.warning_beeps, 'beep')}, last ${formatDays(e.last_beep)}`;
};

export const eventColor = (times?: number) => (times && times > 0 ? RED : GREEN);
