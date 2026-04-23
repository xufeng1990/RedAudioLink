export interface ProtocolEvent {
  times: number;
  last_time: number;
}

export interface LowBatteryEvent {
  warning_beeps: number;
  last_beep: number;
}

export interface Device {
  id: string;
  // Red Protocol JSON fields (canonical)
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
  // App-derived
  location: DeviceLocation;
  lastInspectionDate?: string;
  // Legacy aliases (kept so the older Inspection*Screen flow still type-checks)
  model?: string;
  serialNumber?: string;
  replacementDate?: string;
  dateCode?: string;
  daysRemaining?: string;
  sensorStatus?: 'OK' | 'FAULT' | 'LOW_BATTERY';
  batteryVoltage?: number;
  alarmOffCount?: number;
  alarmOffLastEvent?: string;
  manualTestCount?: number;
  manualTestLastEvent?: string;
  alarmTriggers?: AlarmTrigger[];
}

export interface AlarmTrigger {
  type: string;
  count: number;
  lastEvent: string;
}

export interface DeviceLocation {
  roomType: string;
  roomNumber: string;
}

export interface Property {
  id: string;
  address: string;
  client: string;
  contactNumber: string;
  inspectionDate: string;
  devices: Device[];
}

export interface InspectionReport {
  id: string;
  propertyId: string;
  deviceId: string;
  technicianName: string;
  date: string;
  step: 'report' | 'action' | 'image';
  completed: boolean;
  actions: string[];
  images: string[];
  notes: string;
  location: DeviceLocation;
}

export interface Task {
  id: string;
  title: string;
  taskId: string;
  creationTime: string;
  postalCode: string;
  stateProvince: string;
  address: string;
  status: 'pending' | 'completed';
  property?: Property;
}

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  PropertyDetail: { property: Property };
  DeviceInspection: { device: Device; propertyId: string };
  InspectionAction: { report: InspectionReport; device: Device };
  InspectionImage: { report: InspectionReport; device: Device };
  InspectionComplete: { report: InspectionReport };
};
